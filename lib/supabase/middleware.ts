import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

function redirectWithCookies(
  request: NextRequest,
  to: string,
  supabaseResponse: NextResponse
) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  const redirectResponse = NextResponse.redirect(url);
  // Forward refreshed session cookies with their options (path, httpOnly,
  // maxAge, sameSite, secure) intact — copying only name/value would strip
  // them and break the session on redirect.
  copyCookies(supabaseResponse, redirectResponse);
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAuthCallback = pathname === "/auth/callback";
  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboarding = pathname === "/onboarding";
  const isApiRoute = pathname.startsWith("/api/");

  // Auth callback and API routes (including webhooks) always pass through
  if (isAuthCallback || isApiRoute) {
    return supabaseResponse;
  }

  // Onboarding requires a session but never redirects back to it
  if (!user && isOnboarding) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  // Redirect logged-in users away from auth pages to dashboard
  if (user && isAuthPage) {
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  // Redirect unauthenticated users trying to access dashboard to login
  if (!user && isDashboard) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  return supabaseResponse;
}
