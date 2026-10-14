"use server";

import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import { generateWorkspaceSlug } from "@/lib/workspace-slug";

export async function switchWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Validate user has access to this workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!membership) return { error: "No access to this workspace" };

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true };
}

export async function createWorkspace(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required" };

  // RLS has no INSERT policy on workspaces and workspace_members only allows
  // existing owners, so a user-scoped insert always fails. Insert via the
  // service client instead — this only ever creates a workspace owned by the
  // authenticated caller, same as the handle_new_user trigger.
  const serviceClient = await createServiceClient();

  // The slug carries a random suffix, so a 23505 unique violation is only a
  // theoretical collision — retrying regenerates a fresh suffix.
  let workspace: { id: string } | null = null;
  let error: { message: string; code?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await serviceClient
      .from("workspaces")
      .insert({ name: trimmed, slug: generateWorkspaceSlug(trimmed) })
      .select("id")
      .single();
    workspace = result.data;
    error = result.error;
    if (!error || error.code !== "23505") break;
  }

  if (error || !workspace) {
    return { error: error?.message || "Failed to create workspace" };
  }

  // Add user as owner
  const { error: memberError } = await serviceClient
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    // Clean up the orphaned workspace so retrying doesn't hit slug conflicts.
    await serviceClient.from("workspaces").delete().eq("id", workspace.id);
    return { error: memberError.message };
  }

  // Switch to new workspace
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspace.id, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true, workspaceId: workspace.id };
}
