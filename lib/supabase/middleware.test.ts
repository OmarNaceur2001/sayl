import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "./middleware";

type RefreshedCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  cookiesToRefresh: [] as RefreshedCookie[],
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    config: {
      cookies: { setAll: (cookies: RefreshedCookie[]) => void };
    }
  ) => ({
    auth: {
      getUser: async () => {
        // Simulates the Supabase client rotating the session token during
        // getUser(): it calls setAll with the refreshed cookie before the
        // middleware decides whether to redirect.
        if (state.cookiesToRefresh.length) {
          config.cookies.setAll(state.cookiesToRefresh);
        }
        return { data: { user: state.user } };
      },
    },
  }),
}));

const REFRESHED = {
  name: "sb-test-auth-token",
  value: "refreshed-jwt",
  options: {
    path: "/",
    httpOnly: true,
    maxAge: 3600,
    sameSite: "lax",
    secure: true,
  },
};

function req(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  state.user = null;
  state.cookiesToRefresh = [REFRESHED];
});

describe("updateSession cookie propagation", () => {
  it("redirects unauthenticated dashboard requests to /login and preserves refreshed cookie options", async () => {
    const res = await updateSession(req("/dashboard"));

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");

    const setCookie = res.headers.getSetCookie().join("\n");
    expect(setCookie).toContain("sb-test-auth-token=refreshed-jwt");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Max-Age=3600");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=lax");
  });

  it("redirects authenticated users on /login to /dashboard with refreshed cookies", async () => {
    state.user = { id: "user-1" };

    const res = await updateSession(req("/login"));

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/dashboard");
    expect(res.headers.getSetCookie().join("\n")).toContain(
      "sb-test-auth-token=refreshed-jwt"
    );
    expect(res.headers.getSetCookie().join("\n")).toContain("HttpOnly");
  });

  it("redirects unauthenticated /onboarding to /login with refreshed cookies", async () => {
    const res = await updateSession(req("/onboarding"));

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    expect(res.headers.getSetCookie().join("\n")).toContain(
      "sb-test-auth-token=refreshed-jwt"
    );
  });

  it("lets authenticated users through to /dashboard and sets refreshed cookies", async () => {
    state.user = { id: "user-1" };

    const res = await updateSession(req("/dashboard"));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.getSetCookie().join("\n")).toContain(
      "sb-test-auth-token=refreshed-jwt"
    );
  });

  it("lets authenticated /onboarding through without redirect", async () => {
    state.user = { id: "user-1" };

    const res = await updateSession(req("/onboarding"));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("passes API routes through without redirect even when unauthenticated", async () => {
    const res = await updateSession(req("/api/v1/contacts"));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});
