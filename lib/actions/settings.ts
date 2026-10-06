"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/auth/require-role";
import { updateWorkspaceSecrets } from "@/lib/workspace-secrets";

interface SaveWorkspaceSettingsInput {
  workspaceId: string;
  name: string;
  globalKeywords: string[];
  lateApiKey?: string;
  aiApiKey?: string;
}

export async function saveWorkspaceSettings(input: SaveWorkspaceSettingsInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const roleResult = await requireWorkspaceRole(user.id, input.workspaceId, ["owner", "admin"]);
  if (!roleResult.allowed) {
    return { error: "Only workspace owners and admins can update settings." };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      name: input.name.trim(),
      global_keywords: input.globalKeywords,
    })
    .eq("id", input.workspaceId);

  if (error) return { error: error.message };

  try {
    const updates: { late_api_key_encrypted?: string; ai_api_key?: string } = {};
    if (input.lateApiKey?.trim()) updates.late_api_key_encrypted = input.lateApiKey.trim();
    if (input.aiApiKey?.trim()) updates.ai_api_key = input.aiApiKey.trim();
    if (Object.keys(updates).length > 0) {
      await updateWorkspaceSecrets(input.workspaceId, updates);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update workspace credentials.",
    };
  }

  return { error: null };
}
