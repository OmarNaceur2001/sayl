import type { SupportedLanguage } from "@/lib/types/database";

export type LanguageMessageCounts = Record<SupportedLanguage | "unknown", number>;

export function countMessagesByLanguage(
  messages: readonly { language: SupportedLanguage | null }[]
): LanguageMessageCounts {
  const counts: LanguageMessageCounts = {
    fr: 0,
    en: 0,
    ar: 0,
    tn: 0,
    unknown: 0,
  };

  for (const message of messages) {
    counts[message.language ?? "unknown"] += 1;
  }

  return counts;
}
