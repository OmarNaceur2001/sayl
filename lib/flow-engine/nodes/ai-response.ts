import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SupportedLanguage } from "@/lib/types/database";
import type { FlowExecutionContext, AiResponseNodeData } from "../types";
import { createZernioClient } from "@/lib/zernio-client";
import { getWorkspaceSecrets } from "@/lib/workspace-secrets";
import { generateText, createGateway } from "ai";
import { detectLanguage } from "@/lib/language/detect";
import { pickLocalizedText } from "@/lib/language/pick-text";
import { DEFAULT_HANDOVER_MESSAGES } from "@/lib/ai/fallback-messages";
import { wantsHandover, type HandoverReason } from "@/lib/ai/handover";
import { resolveReplyLanguage, isSupportedLanguage } from "@/lib/ai/language-policy";
import {
  DEFAULT_KB_MIN_SIMILARITY,
  EMBEDDING_MODEL,
  retrieveKbPassages,
  type KbPassage,
} from "@/lib/ai/kb";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { recordUsage } from "@/lib/ai/usage";

type ZernioClient = ReturnType<typeof createZernioClient>;

interface SendTarget {
  zernio: ZernioClient;
  lateAccountId: string;
  lateConversationId: string;
}

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MIN_DETECTION_CONFIDENCE = 0.7;

// Halt the run: continuing would let a downstream Send Message deliver the
// literal "{{ai_response}}" token to the contact (same pause mechanism as
// humanTakeover, but the session is cancelled rather than completed).
async function cancelRun(
  supabase: SupabaseClient<Database>,
  sessionId: string
): Promise<"pause"> {
  await supabase
    .from("flow_sessions")
    .update({ status: "cancelled" })
    .eq("id", sessionId);
  return "pause";
}

async function sendAndStore(
  supabase: SupabaseClient<Database>,
  context: FlowExecutionContext,
  target: SendTarget,
  text: string
) {
  // Send via Zernio REST API (same pattern as executeSendMessage)
  const response = await target.zernio.messages.sendInboxMessage({
    path: { conversationId: target.lateConversationId },
    body: { accountId: target.lateAccountId, message: text },
  });

  await supabase.from("messages").insert({
    conversation_id: context.conversationId,
    direction: "outbound",
    text,
    attachments: null,
    sent_by_flow_id: context.flowId,
    sent_by_node_id: null,
    platform_message_id: response.data?.data?.messageId || null,
    status: "sent",
  });

  await supabase.from("analytics_events").insert({
    workspace_id: context.workspaceId,
    flow_id: context.flowId,
    contact_id: context.contactId,
    event_type: "message_sent",
  });
}

interface HandOverParams {
  reason: HandoverReason;
  language: SupportedLanguage;
  workspaceDefault: SupportedLanguage;
  data: AiResponseNodeData;
  /** null when the message cannot be sent (missing channel/credentials). */
  target: SendTarget | null;
}

/**
 * Tell the customer a person will answer, pause the bot on this conversation
 * and flag the session, so a failure is never silent.
 */
async function handOver(
  supabase: SupabaseClient<Database>,
  context: FlowExecutionContext,
  sessionId: string,
  params: HandOverParams
): Promise<"pause"> {
  const custom = params.data.fallbackMessage
    ? pickLocalizedText(params.data.fallbackMessage, params.language, {
        default_language: params.workspaceDefault,
      })
    : "";
  const message = custom.trim() || DEFAULT_HANDOVER_MESSAGES[params.language];

  if (params.target) {
    try {
      await sendAndStore(supabase, context, params.target, message);
    } catch (error) {
      console.error("Failed to send the handover message:", error);
    }
  }

  await supabase
    .from("conversations")
    .update({ is_automation_paused: true })
    .eq("id", context.conversationId);

  await supabase
    .from("flow_sessions")
    .update({ human_takeover_at: new Date().toISOString(), status: "completed" })
    .eq("id", sessionId);

  await supabase.from("analytics_events").insert({
    workspace_id: context.workspaceId,
    flow_id: context.flowId,
    contact_id: context.contactId,
    event_type: "ai_handover",
    metadata: { reason: params.reason, language: params.language },
  });

  return "pause";
}

function asSupportedLanguage(value: unknown): SupportedLanguage {
  return isSupportedLanguage(value) ? value : "fr";
}

export async function executeAiResponse(
  supabase: SupabaseClient<Database>,
  data: AiResponseNodeData,
  context: FlowExecutionContext,
  sessionId: string
) {
  // Get workspace for Zernio API key + AI Gateway key
  const workspace = await getWorkspaceSecrets(context.workspaceId);

  if (!workspace.late_api_key_encrypted) {
    console.error("No Zernio API key for workspace:", context.workspaceId);
    await logConfigFailure(supabase, context, "missing_zernio_key");
    return cancelRun(supabase, sessionId);
  }

  const zernio = createZernioClient(workspace.late_api_key_encrypted);

  // Resolve late_account_id from channel if not in context
  let lateAccountId = context.lateAccountId;
  if (!lateAccountId) {
    const { data: channel } = await supabase
      .from("channels")
      .select("late_account_id, platform")
      .eq("id", context.channelId)
      .single();

    if (!channel) {
      console.error("No channel found for id:", context.channelId);
      await logConfigFailure(supabase, context, "channel_not_found");
      return cancelRun(supabase, sessionId);
    }
    lateAccountId = channel.late_account_id;
    if (!context.platform) {
      context.platform = channel.platform as FlowExecutionContext["platform"];
    }
  }

  // Resolve late_conversation_id from conversation if not in context
  let lateConversationId = context.lateConversationId;
  if (!lateConversationId) {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("late_conversation_id")
      .eq("id", context.conversationId)
      .single();

    if (!conversation?.late_conversation_id) {
      console.error("No late_conversation_id found for conversation:", context.conversationId);
      await logConfigFailure(supabase, context, "conversation_not_found");
      return cancelRun(supabase, sessionId);
    }
    lateConversationId = conversation.late_conversation_id;
  }

  const target: SendTarget = { zernio, lateAccountId, lateConversationId };
  const model = data.model || DEFAULT_MODEL;
  const contextMessages = data.contextMessages || 10;

  const [conversationRow, contactRow, workspaceRow, messagesRow] = await Promise.all([
    supabase.from("conversations").select("language").eq("id", context.conversationId).maybeSingle(),
    supabase.from("contacts").select("language").eq("id", context.contactId).maybeSingle(),
    supabase.from("workspaces").select("default_language").eq("id", context.workspaceId).maybeSingle(),
    supabase
      .from("messages")
      .select("direction, text")
      .eq("conversation_id", context.conversationId)
      .order("created_at", { ascending: false })
      .limit(contextMessages),
  ]);

  const recentMessages = messagesRow.data ?? [];
  const workspaceDefault = asSupportedLanguage(workspaceRow.data?.default_language);

  // Build messages array for the AI (chronological order, oldest first)
  const aiMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of [...recentMessages].reverse()) {
    if (!msg.text) continue;
    aiMessages.push({
      role: msg.direction === "inbound" ? "user" : "assistant",
      content: msg.text,
    });
  }
  if (aiMessages.length === 0 && context.incomingMessage.text) {
    aiMessages.push({ role: "user", content: context.incomingMessage.text });
  }

  const inboundTexts = recentMessages
    .filter((msg) => msg.direction === "inbound" && msg.text)
    .map((msg) => msg.text as string);
  const latestInbound = inboundTexts[0] ?? context.incomingMessage.text ?? "";

  // Reply language: forced > freshly detected > conversation > contact > workspace default
  const forced = data.replyLanguage && data.replyLanguage !== "auto" ? data.replyLanguage : null;
  const detection = latestInbound ? detectLanguage(latestInbound) : null;
  const detected =
    detection && detection.lang !== "unknown" && detection.confidence >= MIN_DETECTION_CONFIDENCE
      ? detection.lang
      : null;
  const language = resolveReplyLanguage({
    override: forced,
    detected,
    conversationLanguage: conversationRow.data?.language,
    contactLanguage: contactRow.data?.language,
    workspaceDefault,
  });

  const usageBase = {
    workspaceId: context.workspaceId,
    flowId: context.flowId,
    contactId: context.contactId,
    conversationId: context.conversationId,
    language,
  };
  const handOverWith = (reason: HandoverReason) =>
    handOver(supabase, context, sessionId, { reason, language, workspaceDefault, data, target });

  if (aiMessages.length === 0) {
    await recordUsage(supabase, { ...usageBase, kind: "ai_response", model, status: "handover",
      metadata: { reason: "no_text" } });
    return handOverWith("no_text");
  }

  const aiGatewayKey = workspace.ai_api_key || process.env.AI_GATEWAY_API_KEY;

  // Knowledge base (opt-in per node)
  let passages: KbPassage[] | undefined;
  const useKnowledgeBase = data.useKnowledgeBase === true;
  const answerOnlyFromKb = useKnowledgeBase && data.answerOnlyFromKb !== false;
  if (useKnowledgeBase) {
    try {
      const query = inboundTexts.slice(0, 2).reverse().join("\n") || latestInbound;
      const result = await retrieveKbPassages(supabase, {
        workspaceId: context.workspaceId,
        query,
        apiKey: aiGatewayKey || undefined,
        minSimilarity: data.kbMinSimilarity ?? DEFAULT_KB_MIN_SIMILARITY,
      });
      passages = result.passages;
      await recordUsage(supabase, {
        ...usageBase,
        kind: "embedding",
        model: EMBEDDING_MODEL,
        inputTokens: result.embeddingTokens,
        costUsd: estimateCostUsd(EMBEDDING_MODEL, result.embeddingTokens, 0),
      });
    } catch (error) {
      // Never answer "blind" when the node was configured to use the knowledge base.
      console.error("Knowledge base retrieval failed:", error);
      await recordUsage(supabase, { ...usageBase, kind: "embedding", model: EMBEDDING_MODEL,
        status: "failed", metadata: { error: error instanceof Error ? error.message : "unknown" } });
      return data.handoverOnFailure === false ? cancelRun(supabase, sessionId) : handOverWith("ai_error");
    }

    if (passages.length === 0 && answerOnlyFromKb) {
      await recordUsage(supabase, { ...usageBase, kind: "ai_response", model, status: "handover",
        metadata: { reason: "no_kb_match" } });
      return handOverWith("no_kb_match");
    }
  }

  const script = detection?.script;
  const system = buildSystemPrompt({
    basePrompt: data.systemPrompt ?? "",
    language,
    script,
    forcedLanguage: forced !== null,
    passages,
    answerOnlyFromKb,
  });

  let stage: "generate" | "send" = "generate";
  try {
    const gw = createGateway({ apiKey: aiGatewayKey || undefined });
    const result = await generateText({
      model: gw(model),
      system,
      messages: aiMessages,
      temperature: data.temperature ?? (useKnowledgeBase ? 0.3 : 0.7),
      maxOutputTokens: data.maxTokens ?? 500,
    });

    const text = result.text.trim();
    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;
    const costUsd = estimateCostUsd(model, inputTokens, outputTokens);

    if (wantsHandover(text) || text === "") {
      await recordUsage(supabase, { ...usageBase, kind: "ai_response", model, inputTokens,
        outputTokens, costUsd, status: "handover", metadata: { reason: "model_requested" } });
      return handOverWith("model_requested");
    }

    await recordUsage(supabase, { ...usageBase, kind: "ai_response", model, inputTokens,
      outputTokens, costUsd, status: "ok",
      metadata: { kb_passages: passages?.length ?? 0 } });

    // Expose the generated text to downstream nodes as {{ai_response}}
    context.variables = { ...(context.variables ?? {}), ai_response: text };

    if (data.sendDirectly !== false) {
      stage = "send";
      await sendAndStore(supabase, context, target, text);
    }
  } catch (error) {
    console.error("Failed to generate or send AI response:", error);

    await supabase.from("messages").insert({
      conversation_id: context.conversationId,
      direction: "outbound",
      text: "[AI response failed]",
      sent_by_flow_id: context.flowId,
      status: "failed",
    });

    await supabase.from("analytics_events").insert({
      workspace_id: context.workspaceId,
      flow_id: context.flowId,
      contact_id: context.contactId,
      event_type: "message_failed",
      metadata: { error: error instanceof Error ? error.message : "Unknown error" },
    });

    await recordUsage(supabase, { ...usageBase, kind: "ai_response", model, status: "failed",
      metadata: { stage, error: error instanceof Error ? error.message : "unknown" } });

    if (data.handoverOnFailure === false) return cancelRun(supabase, sessionId);
    return handOverWith(stage === "send" ? "send_error" : "ai_error");
  }
}

async function logConfigFailure(
  supabase: SupabaseClient<Database>,
  context: FlowExecutionContext,
  reason: string
) {
  await supabase.from("analytics_events").insert({
    workspace_id: context.workspaceId,
    flow_id: context.flowId,
    contact_id: context.contactId,
    event_type: "message_failed",
    metadata: { error: reason, node: "aiResponse" },
  });
}
