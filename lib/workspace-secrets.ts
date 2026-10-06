import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type WorkspaceSecrets = Database["public"]["Tables"]["workspace_secrets"]["Row"];

export async function getWorkspaceSecrets(
  workspaceId: string
): Promise<WorkspaceSecrets> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("workspace_secrets")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load workspace secrets: ${error.message}`);
  }

  return data ?? {
    workspace_id: workspaceId,
    late_api_key_encrypted: null,
    ai_api_key: null,
    webhook_secret: null,
  };
}

export async function updateWorkspaceSecrets(
  workspaceId: string,
  updates: Pick<Partial<WorkspaceSecrets>, "late_api_key_encrypted" | "ai_api_key">
): Promise<void> {
  const supabase = await createServiceClient();
  const { data: existing, error: readError } = await supabase
    .from("workspace_secrets")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to load workspace secrets: ${readError.message}`);
  }

  const { error } = await supabase.from("workspace_secrets").upsert({
    workspace_id: workspaceId,
    late_api_key_encrypted: existing?.late_api_key_encrypted ?? null,
    ai_api_key: existing?.ai_api_key ?? null,
    webhook_secret: existing?.webhook_secret ?? null,
    ...updates,
  });

  if (error) {
    throw new Error(`Failed to update workspace secrets: ${error.message}`);
  }
}
