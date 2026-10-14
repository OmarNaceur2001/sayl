import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const WORKSPACE_COOKIE = "zernflow_workspace_id";

type UserClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolves the workspace the user is currently operating in: the
 * workspace-switcher cookie if it points at a valid membership, otherwise the
 * user's first workspace. Returns null when the user has no membership at all.
 * Shared by RSC pages (getWorkspace) and API route handlers so both honor the
 * same selected workspace.
 */
export async function resolveWorkspaceMembership(
  supabase: UserClient,
  userId: string
) {
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(WORKSPACE_COOKIE)?.value;

  if (selectedId) {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces(*)")
      .eq("user_id", userId)
      .eq("workspace_id", selectedId)
      .maybeSingle();

    if (membership?.workspaces) {
      return membership;
    }
  }

  // Fallback to first workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(*)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return membership?.workspaces ? membership : null;
}

/**
 * Cached per-request: deduplicates across layout + page in the same render.
 * Reads workspace ID from cookie if set; falls back to first workspace.
 * Redirects: unauthenticated → /login, authenticated without a workspace → /onboarding.
 */
export const getWorkspace = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const membership = await resolveWorkspaceMembership(supabase, user.id);

  // An authenticated user with no workspace must not bounce back to /login:
  // middleware sends logged-in users away from auth pages, which would create
  // a /dashboard -> /login -> /dashboard redirect loop.
  if (!membership) redirect("/onboarding");

  return {
    user,
    workspace: membership.workspaces,
    role: membership.role,
    supabase,
  };
});
