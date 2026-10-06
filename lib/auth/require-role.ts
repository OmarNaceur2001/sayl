import { createClient } from "@/lib/supabase/server";

export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceRoleResult =
  | { allowed: true; role: WorkspaceRole }
  | { allowed: false; role: WorkspaceRole | null };

const WORKSPACE_ROLES: readonly WorkspaceRole[] = ["owner", "admin", "member"];

export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  allowedRoles: readonly WorkspaceRole[]
): Promise<WorkspaceRoleResult> {
  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify workspace role: ${error.message}`);
  }

  const role = WORKSPACE_ROLES.find((candidate) => candidate === membership?.role) ?? null;
  if (role !== null && allowedRoles.includes(role)) {
    return { allowed: true, role };
  }

  return { allowed: false, role };
}
