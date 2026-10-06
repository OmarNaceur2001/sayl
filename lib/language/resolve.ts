import type {
  LanguageSource,
  SupportedLanguage,
} from "@/lib/types/database";
import type { LanguageDetection } from "./detect";

interface ContactLanguageState {
  language: SupportedLanguage | null;
  language_confidence: number | null;
  language_source: LanguageSource | null;
}

interface WorkspaceLanguageSettings {
  default_language: SupportedLanguage;
}

export interface ResolvedContactLanguage {
  contactLanguage: SupportedLanguage;
  languageConfidence: number | null;
  languageSource: LanguageSource;
  conversationLanguage: SupportedLanguage;
  shouldUpdateContact: boolean;
}

export function resolveContactLanguage(
  contact: ContactLanguageState,
  workspace: WorkspaceLanguageSettings,
  detection: LanguageDetection | null,
  previousConversationLanguage: SupportedLanguage | null = null
): ResolvedContactLanguage {
  const currentLanguage = contact.language ?? workspace.default_language;
  const currentSource: LanguageSource = contact.language_source ?? "default";
  const detectedLanguage =
    detection && detection.lang !== "unknown" && detection.confidence >= 0.6
      ? detection.lang
      : null;
  const canChangeContact = currentSource !== "manual";
  const hasConsecutiveAlternative =
    detectedLanguage !== null &&
    detectedLanguage !== currentLanguage &&
    previousConversationLanguage === detectedLanguage;
  const shouldUpdateContact =
    detectedLanguage !== null &&
    canChangeContact &&
    (contact.language === null ||
      detectedLanguage === currentLanguage ||
      hasConsecutiveAlternative);

  const nextContactLanguage =
    shouldUpdateContact && detectedLanguage ? detectedLanguage : currentLanguage;
  const nextLanguageSource: LanguageSource =
    shouldUpdateContact && detectedLanguage
      ? detectedLanguage === currentLanguage && contact.language !== null
        ? currentSource
        : "detected"
      : currentSource;

  return {
    contactLanguage: nextContactLanguage,
    languageConfidence:
      shouldUpdateContact && detection ? detection.confidence : contact.language_confidence,
    languageSource: nextLanguageSource,
    conversationLanguage: detectedLanguage ?? previousConversationLanguage ?? nextContactLanguage,
    shouldUpdateContact:
      shouldUpdateContact &&
      (contact.language !== nextContactLanguage ||
        contact.language_confidence !== detection?.confidence ||
        contact.language_source !== nextLanguageSource),
  };
}
