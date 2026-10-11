import type { SupportedLanguage } from "@/lib/types/database";

/**
 * Sent to the customer when the AI hands the conversation over to a human
 * (failure, no answer in the knowledge base, or the customer asks for a person).
 * Workspaces can override this per node with `fallbackMessage`.
 *
 * ⚠️  DARIJA REVIEW NOTES (native speaker, please check):
 *   - `tn` (Arabic script): tone = friendly Tunisian shop assistant, not formal MSA.
 *     Current phrasing reviewed Oct 2026 — adjust if it sounds off in your dialect.
 *   - If the customer wrote in Arabizi (Latin), the node should ideally switch to
 *     an Arabizi variant; that override lives in the node config (`fallbackMessage`).
 */
export const DEFAULT_HANDOVER_MESSAGES: Record<SupportedLanguage, string> = {
  fr: "Merci pour votre message. Un membre de notre équipe vous répondra très bientôt.",
  en: "Thanks for your message. A member of our team will get back to you shortly.",
  // Modern Standard Arabic — kept formal for non-Tunisian contexts.
  ar: "شكراً على رسالتك. سيقوم أحد أعضاء فريقنا بالرد عليك قريباً.",
  // Tunisian Darija — Arabic script, shop-assistant register.
  // Literal: "Hello! We received your message. One of our team will reply to you shortly."
  // Arabizi equivalent for your node fallbackMessage: "Salam! Weslitna message mte3ek. Wa7ed mel fari9 mte3na bech yrodlek fi a9reb wa9t."
  tn: "السلامة! وصلتنا رسالتك. واحد من الفريق متاعنا باش يرد عليك في أقرب وقت.",
};
