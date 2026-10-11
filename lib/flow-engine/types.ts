import type { NodeType, Platform, SupportedLanguage } from "@/lib/types/database";
import type { LanguageTranslations, LocalizedText } from "@/lib/language/pick-text";

export interface FlowNode {
  id: string;
  type: NodeType;
  data: NodeData;
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export type NodeData =
  | TriggerNodeData
  | SendMessageNodeData
  | ConditionNodeData
  | DelayNodeData
  | TagNodeData
  | SetFieldNodeData
  | HttpRequestNodeData
  | GoToFlowNodeData
  | HumanTakeoverNodeData
  | ABSplitNodeData
  | SmartDelayNodeData
  | SubscribeNodeData
  | CommentReplyNodeData
  | PrivateReplyNodeData
  | AiResponseNodeData
  | EnrollSequenceNodeData;

export interface TriggerNodeData {
  triggerType: string;
  keywords?: Array<{
    value: string;
    matchType: "exact" | "contains" | "startsWith";
  }>;
  payload?: string;
}

export interface SendMessageNodeData {
  messages: Array<{
    text?: string;
    translations?: LanguageTranslations;
    imageUrl?: string;
    quickReplies?: Array<{ title: string; translations?: LanguageTranslations; payload: string }>;
    buttons?: Array<{
      title: string;
      translations?: LanguageTranslations;
      type: "postback" | "url";
      payload?: string;
      url?: string;
    }>;
    carousel?: {
      elements: Array<{
        imageUrl?: string;
        title: string;
        translations?: LanguageTranslations;
        subtitle?: string;
        subtitleTranslations?: LanguageTranslations;
        buttons?: Array<{
          type: "postback" | "url";
          title: string;
          translations?: LanguageTranslations;
          payload?: string;
          url?: string;
        }>;
      }>;
    };
  }>;
}

export interface ConditionNodeData {
  conditions: Array<{
    field: string;
    operator: "equals" | "not_equals" | "contains" | "exists" | "gt" | "lt";
    value: string;
  }>;
  logic: "and" | "or";
}

export interface DelayNodeData {
  duration: number;
  unit: "seconds" | "minutes" | "hours" | "days";
}

export interface TagNodeData {
  action: "add" | "remove";
  tagName: string;
}

export interface SetFieldNodeData {
  fieldSlug: string;
  value: string;
}

export interface HttpRequestNodeData {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: string;
  responseVariable?: string;
}

export interface GoToFlowNodeData {
  flowId: string;
  returnAfter: boolean;
}

export interface HumanTakeoverNodeData {
  message?: string;
}

export interface ABSplitNodeData {
  paths: Array<{ name: string; weight: number }>;
}

export interface SmartDelayNodeData {
  timeout: number;
  timeoutUnit: "minutes" | "hours" | "days";
}

export interface SubscribeNodeData {
  action: "subscribe" | "unsubscribe";
}

export interface CommentReplyNodeData {
  /** Text to reply to the comment with. Supports {{variable}} interpolation. */
  text: string;
  translations?: LanguageTranslations;
}

export interface PrivateReplyNodeData {
  /** Text to send as a private DM to the commenter. Supports {{variable}} interpolation. */
  text: string;
  translations?: LanguageTranslations;
  imageUrl?: string;
}

export interface AiResponseNodeData {
  label?: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  contextMessages: number;
  /**
   * The generated text is always stored in the ai_response variable. When false,
   * the node ONLY stores it (no send), so a later Send Message node can use
   * {{ai_response}} without double-sending. Defaults to true for back-compat.
   */
  sendDirectly?: boolean;
  /** Reply language: "auto" (default) follows the customer; or force one language. */
  replyLanguage?: "auto" | SupportedLanguage;
  /** Ground answers in the workspace knowledge base (RAG). Default false. */
  useKnowledgeBase?: boolean;
  /**
   * With the knowledge base on: only answer from retrieved passages and hand the
   * conversation to a human when nothing relevant is found. Default true.
   */
  answerOnlyFromKb?: boolean;
  /** Minimum cosine similarity (0-1) for a passage to count as relevant. Default 0.25. */
  kbMinSimilarity?: number;
  /**
   * On AI/send failure (or when the model asks for a human): tell the customer,
   * pause automation and flag the conversation instead of failing silently.
   * Default true.
   */
  handoverOnFailure?: boolean;
  /** Custom message sent to the customer on handover (per language). */
  fallbackMessage?: LocalizedText;
}

export interface EnrollSequenceNodeData {
  /** The ID of the sequence to enroll the contact into */
  sequenceId: string;
}

export interface FlowExecutionContext {
  triggerId: string;
  flowId: string;
  channelId: string;
  contactId: string;
  conversationId: string;
  workspaceId: string;
  /** The Zernio API conversation ID (from conversations.late_conversation_id) */
  lateConversationId?: string;
  /** The Zernio API account ID (from channels.late_account_id) */
  lateAccountId?: string;
  incomingMessage: {
    text?: string;
    postbackPayload?: string;
    quickReplyPayload?: string;
    callbackData?: string;
    sender?: { id: string; name?: string; username?: string };
  };
  variables?: Record<string, unknown>;
  platform?: Platform;
}
