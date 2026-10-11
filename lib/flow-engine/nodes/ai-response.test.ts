import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { AiResponseNodeData, FlowExecutionContext } from "../types";

const { generateText, sendInboxMessage, retrieveKbPassages, getWorkspaceSecrets } = vi.hoisted(() => ({
  generateText: vi.fn(),
  sendInboxMessage: vi.fn(),
  retrieveKbPassages: vi.fn(),
  getWorkspaceSecrets: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText,
  createGateway: () => (modelId: string) => ({ modelId }),
  embed: vi.fn(),
  embedMany: vi.fn(),
}));
vi.mock("@/lib/zernio-client", () => ({
  createZernioClient: () => ({ messages: { sendInboxMessage } }),
}));
vi.mock("@/lib/workspace-secrets", () => ({ getWorkspaceSecrets }));
vi.mock("@/lib/ai/kb", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/kb")>()),
  retrieveKbPassages,
}));

import { executeAiResponse } from "./ai-response";

interface Fixture {
  conversationLanguage?: string | null;
  contactLanguage?: string | null;
  workspaceDefault?: string;
  messages?: Array<{ direction: "inbound" | "outbound"; text: string | null }>;
}

function makeSupabase(fixture: Fixture = {}) {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
  const messages = fixture.messages ?? [{ direction: "inbound" as const, text: "bonjour" }];

  const single = (table: string) => {
    if (table === "conversations") return { language: fixture.conversationLanguage ?? null };
    if (table === "contacts") return { language: fixture.contactLanguage ?? null };
    if (table === "workspaces") return { default_language: fixture.workspaceDefault ?? "fr" };
    return null;
  };

  const from = (table: string) => {
    let op: "select" | "update" = "select";
    let patch: Record<string, unknown> = {};
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => ({ data: single(table), error: null }),
      single: async () => ({ data: single(table), error: null }),
      insert: async (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return { error: null };
      },
      update: (value: Record<string, unknown>) => {
        op = "update";
        patch = value;
        return builder;
      },
      then: (resolve: (value: unknown) => unknown) => {
        if (op === "update") {
          updates.push({ table, patch });
          return resolve({ error: null });
        }
        return resolve({ data: table === "messages" ? messages : [], error: null });
      },
    };
    return builder;
  };

  const client = { from } as unknown as SupabaseClient<Database>;
  const where = (table: string, predicate?: (row: Record<string, unknown>) => boolean) =>
    inserts.filter((entry) => entry.table === table && (predicate?.(entry.row) ?? true)).map((entry) => entry.row);
  return { client, inserts, updates, where };
}

const context = (overrides: Partial<FlowExecutionContext> = {}): FlowExecutionContext => ({
  triggerId: "t1",
  flowId: "f1",
  channelId: "ch1",
  contactId: "c1",
  conversationId: "conv1",
  workspaceId: "w1",
  lateAccountId: "acc1",
  lateConversationId: "lconv1",
  incomingMessage: { text: "hello" },
  ...overrides,
});

const node = (overrides: Partial<AiResponseNodeData> = {}): AiResponseNodeData => ({
  model: "openai/gpt-4o-mini",
  systemPrompt: "Tu vends des robes à Sousse.",
  temperature: 0.7,
  maxTokens: 500,
  contextMessages: 10,
  ...overrides,
});

const ok = (text: string) => ({ text, usage: { inputTokens: 1000, outputTokens: 200 } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  getWorkspaceSecrets.mockResolvedValue({ late_api_key_encrypted: "zk", ai_api_key: null });
  sendInboxMessage.mockResolvedValue({ data: { data: { messageId: "m1" } } });
  retrieveKbPassages.mockResolvedValue({ passages: [], embeddingTokens: 0 });
});

describe("executeAiResponse", () => {
  it("replies in Arabizi Darija, sends the answer and logs cost", async () => {
    const { client, where, updates } = makeSupabase({
      messages: [{ direction: "inbound", text: "9adech el soum mta3 el produit?" }],
    });
    generateText.mockResolvedValue(ok("El soum 89 DT, w el livraison 7 DT."));

    const result = await executeAiResponse(client, node(), context(), "s1");

    expect(result).toBeUndefined();
    const call = generateText.mock.calls[0][0];
    expect(call.system).toContain("Tu vends des robes à Sousse.");
    expect(call.system).toContain("Tunisian Arabic (Darija), NOT Modern Standard Arabic");
    expect(call.system).toContain("Answer in the same Arabizi");
    expect(sendInboxMessage).toHaveBeenCalledWith({
      path: { conversationId: "lconv1" },
      body: { accountId: "acc1", message: "El soum 89 DT, w el livraison 7 DT." },
    });
    expect(where("messages", (row) => row.status === "sent")).toHaveLength(1);
    const [usage] = where("usage_events");
    expect(usage).toMatchObject({
      kind: "ai_response",
      status: "ok",
      language: "tn",
      input_tokens: 1000,
      output_tokens: 200,
      cost_usd: 0.00027,
    });
    expect(updates).toHaveLength(0);
  });

  it("exposes the answer as {{ai_response}} without sending when sendDirectly is false", async () => {
    const { client } = makeSupabase();
    generateText.mockResolvedValue(ok("Bonjour !"));
    const ctx = context();
    await executeAiResponse(client, node({ sendDirectly: false }), ctx, "s1");
    expect(ctx.variables?.ai_response).toBe("Bonjour !");
    expect(sendInboxMessage).not.toHaveBeenCalled();
  });

  it("hands over when the model asks for a human: localized message, bot paused, nothing leaked", async () => {
    const { client, where, updates } = makeSupabase({
      messages: [{ direction: "inbound", text: "n7eb nkalem wahed, mouch bot" }],
    });
    generateText.mockResolvedValue(ok("[[HANDOVER]] Sorry I cannot help"));

    const result = await executeAiResponse(client, node(), context(), "s1");

    expect(result).toBe("pause");
    const sent = sendInboxMessage.mock.calls[0][0].body.message as string;
    expect(sent).toContain("الميساج"); // Tunisian default fallback
    expect(sent).not.toContain("Sorry I cannot help");
    expect(updates).toContainEqual({ table: "conversations", patch: { is_automation_paused: true } });
    expect(updates.find((u) => u.table === "flow_sessions")?.patch).toMatchObject({ status: "completed" });
    expect(where("analytics_events", (r) => r.event_type === "ai_handover")[0]).toMatchObject({
      metadata: { reason: "model_requested", language: "tn" },
    });
    expect(where("usage_events")[0]).toMatchObject({ status: "handover" });
  });

  it("never fails silently: on AI error the customer is told and the bot is paused", async () => {
    const { client, where, updates } = makeSupabase({ conversationLanguage: "fr" });
    generateText.mockRejectedValue(new Error("gateway timeout"));

    const result = await executeAiResponse(client, node(), context(), "s1");

    expect(result).toBe("pause");
    expect(sendInboxMessage.mock.calls[0][0].body.message).toContain("Merci pour votre message");
    expect(updates).toContainEqual({ table: "conversations", patch: { is_automation_paused: true } });
    expect(where("messages", (r) => r.status === "failed")).toHaveLength(1);
    expect(where("usage_events")[0]).toMatchObject({ status: "failed" });
    expect(where("analytics_events", (r) => r.event_type === "ai_handover")[0]).toMatchObject({
      metadata: { reason: "ai_error" },
    });
  });

  it("keeps the old behaviour (cancel, no message) when handoverOnFailure is false", async () => {
    const { client, updates } = makeSupabase();
    generateText.mockRejectedValue(new Error("boom"));
    const result = await executeAiResponse(client, node({ handoverOnFailure: false }), context(), "s1");
    expect(result).toBe("pause");
    expect(sendInboxMessage).not.toHaveBeenCalled();
    expect(updates).toContainEqual({ table: "flow_sessions", patch: { status: "cancelled" } });
  });

  it("uses a custom per-language fallback message", async () => {
    const { client } = makeSupabase({ conversationLanguage: "en" });
    generateText.mockRejectedValue(new Error("boom"));
    await executeAiResponse(
      client,
      node({ fallbackMessage: { text: "fr text", translations: { en: "Custom: an agent will call you." } } }),
      context(),
      "s1"
    );
    expect(sendInboxMessage.mock.calls[0][0].body.message).toBe("Custom: an agent will call you.");
  });

  it("reports a send failure as a handover attempt without crashing", async () => {
    const { client, where } = makeSupabase();
    generateText.mockResolvedValue(ok("Bonjour"));
    sendInboxMessage.mockRejectedValue(new Error("platform down"));
    const result = await executeAiResponse(client, node(), context(), "s1");
    expect(result).toBe("pause");
    expect(where("analytics_events", (r) => r.event_type === "ai_handover")[0]).toMatchObject({
      metadata: { reason: "send_error" },
    });
  });

  it("hands over WITHOUT calling the model when the KB has no relevant passage", async () => {
    const { client, where } = makeSupabase({ messages: [{ direction: "inbound", text: "Vous vendez des voitures ?" }] });
    const result = await executeAiResponse(client, node({ useKnowledgeBase: true }), context(), "s1");
    expect(result).toBe("pause");
    expect(generateText).not.toHaveBeenCalled();
    expect(where("analytics_events", (r) => r.event_type === "ai_handover")[0]).toMatchObject({
      metadata: { reason: "no_kb_match" },
    });
  });

  it("grounds the answer in retrieved passages and logs embedding usage", async () => {
    const { client, where } = makeSupabase({
      messages: [{ direction: "inbound", text: "Livraison à Sfax ?" }],
    });
    retrieveKbPassages.mockResolvedValue({
      passages: [{ id: "p1", documentId: "d1", content: "Livraison: 7 DT partout en Tunisie", similarity: 0.7 }],
      embeddingTokens: 9,
    });
    generateText.mockResolvedValue(ok("Oui, 7 DT."));
    // temperature not set on the node => grounded answers default to a low value
    const unsetTemperature = { ...node({ useKnowledgeBase: true }), temperature: undefined } as unknown as AiResponseNodeData;
    await executeAiResponse(client, unsetTemperature, context(), "s1");

    const call = generateText.mock.calls[0][0];
    expect(call.system).toContain("[1] Livraison: 7 DT partout en Tunisie");
    expect(call.temperature).toBe(0.3);
    expect(where("usage_events").map((row) => row.kind)).toEqual(["embedding", "ai_response"]);
  });

  it("hands over instead of answering blind when KB retrieval itself fails", async () => {
    const { client } = makeSupabase();
    retrieveKbPassages.mockRejectedValue(new Error("rpc down"));
    const result = await executeAiResponse(client, node({ useKnowledgeBase: true }), context(), "s1");
    expect(result).toBe("pause");
    expect(generateText).not.toHaveBeenCalled();
    expect(sendInboxMessage).toHaveBeenCalledTimes(1);
  });

  it("hands over when there is no text to answer (attachment only)", async () => {
    const { client } = makeSupabase({ messages: [{ direction: "inbound", text: null }] });
    const result = await executeAiResponse(client, node(), context({ incomingMessage: {} }), "s1");
    expect(result).toBe("pause");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("cancels (cannot message anyone) and logs when the Zernio key is missing", async () => {
    const { client, where, updates } = makeSupabase();
    getWorkspaceSecrets.mockResolvedValue({ late_api_key_encrypted: null, ai_api_key: null });
    const result = await executeAiResponse(client, node(), context(), "s1");
    expect(result).toBe("pause");
    expect(updates).toContainEqual({ table: "flow_sessions", patch: { status: "cancelled" } });
    expect(where("analytics_events")[0]).toMatchObject({ event_type: "message_failed", metadata: { error: "missing_zernio_key" } });
  });

  it("forces the configured reply language", async () => {
    const { client } = makeSupabase({ messages: [{ direction: "inbound", text: "Bonjour" }] });
    generateText.mockResolvedValue(ok("Hello"));
    await executeAiResponse(client, node({ replyLanguage: "en" }), context(), "s1");
    expect(generateText.mock.calls[0][0].system).toContain("Always reply in the language described below");
    expect(generateText.mock.calls[0][0].system).toContain("Reply in English");
  });
});
