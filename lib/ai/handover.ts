/** The model is instructed to answer with exactly this token when it must not answer. */
export const HANDOVER_MARKER = "[[HANDOVER]]";

/**
 * Any occurrence counts, even with extra text around it: when the model signals
 * a handover we never forward its free text to the customer.
 */
export function wantsHandover(text: string): boolean {
  return text.includes(HANDOVER_MARKER);
}

export type HandoverReason =
  | "model_requested"
  | "no_kb_match"
  | "ai_error"
  | "send_error"
  | "no_text";
