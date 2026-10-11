import type { SupportedLanguage } from "@/lib/types/database";

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ["fr", "en", "ar", "tn"];

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

export interface ReplyLanguageInput {
  /** Node-level setting: "auto" (default) or a forced language. */
  override?: string | null;
  /** Language detected on the customer's latest message, if confident. */
  detected?: SupportedLanguage | null;
  conversationLanguage?: string | null;
  contactLanguage?: string | null;
  workspaceDefault?: string | null;
}

/** Forced > freshly detected > conversation > contact > workspace default > fr. */
export function resolveReplyLanguage(input: ReplyLanguageInput): SupportedLanguage {
  const candidates = [
    input.override === "auto" ? null : input.override,
    input.detected,
    input.conversationLanguage,
    input.contactLanguage,
    input.workspaceDefault,
  ];
  for (const candidate of candidates) {
    if (isSupportedLanguage(candidate)) return candidate;
  }
  return "fr";
}

export type CustomerScript = "latin" | "arabic" | "mixed";

const STYLE: Record<SupportedLanguage, string> = {
  fr: "Reply in French with a polite, clear business tone. Use vouvoiement unless the customer uses tutoiement.",
  en: "Reply in English with a clear, friendly business tone.",
  ar: "Reply in Modern Standard Arabic (Fusha), short and simple, written in Arabic script.",
  tn:
    "Reply in Tunisian Arabic (Darija), NOT Modern Standard Arabic. Sound like a friendly Tunisian shop assistant. " +
    "Typical words: barcha/برشا, behi/باهي, tawa/توا, kifech/كيفاش, 9adech/قداش, famma/فما, mouch/موش. " +
    "Keep the French business words customers use (livraison, commande, prix, adresse) as they are.",
};

const TN_SCRIPT: Record<CustomerScript, string> = {
  latin:
    "The customer writes Darija in Latin letters (Arabizi: 3=ع 7=ح 9=ق 5=خ). Answer in the same Arabizi, not in Arabic script.",
  arabic: "The customer writes in Arabic script. Answer in Arabic script.",
  mixed:
    "The customer mixes Arabic script and Latin letters. Mirror that mix naturally; keep French words in Latin letters.",
};

/** The block appended to the workspace's own system prompt. */
export function buildLanguageInstructions(
  language: SupportedLanguage,
  options: { script?: CustomerScript; forced?: boolean } = {}
): string {
  const lines = [
    options.forced
      ? `Always reply in the language described below, whatever language the customer writes in.`
      : `The customer's language was detected as "${language}". Reply in the language and script of the customer's latest message; if it is unclear, use "${language}".`,
    STYLE[language],
  ];
  if (language === "tn" && options.script) lines.push(TN_SCRIPT[options.script]);
  lines.push("Keep replies short (1-3 sentences): this is a chat conversation.");
  return lines.join("\n");
}
