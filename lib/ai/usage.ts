import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SupportedLanguage, UsageEventKind, UsageEventStatus } from "@/lib/types/database";

export interface UsageRecord {
  workspaceId: string;
  flowId?: string | null;
  contactId?: string | null;
  conversationId?: string | null;
  kind: UsageEventKind;
  model?: string | null;
  language?: SupportedLanguage | null;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number | null;
  status?: UsageEventStatus;
  metadata?: Record<string, string | number | boolean | null>;
}

/** Best-effort: logging must never break a customer conversation. */
export async function recordUsage(
  supabase: SupabaseClient<Database>,
  record: UsageRecord
): Promise<void> {
  try {
    const { error } = await supabase.from("usage_events").insert({
      workspace_id: record.workspaceId,
      flow_id: record.flowId ?? null,
      contact_id: record.contactId ?? null,
      conversation_id: record.conversationId ?? null,
      kind: record.kind,
      model: record.model ?? null,
      language: record.language ?? null,
      input_tokens: Math.max(0, Math.round(record.inputTokens ?? 0)),
      output_tokens: Math.max(0, Math.round(record.outputTokens ?? 0)),
      cost_usd: record.costUsd ?? null,
      status: record.status ?? "ok",
      metadata: record.metadata ?? null,
    });
    if (error) console.error("[usage] failed to record usage event:", error.message);
  } catch (error) {
    console.error("[usage] failed to record usage event:", error);
  }
}
