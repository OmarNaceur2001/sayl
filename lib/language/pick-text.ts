import type { SupportedLanguage } from "@/lib/types/database";

export type LanguageTranslations = Partial<Record<SupportedLanguage, string>>;

export interface LocalizedText {
  text?: string;
  translations?: LanguageTranslations;
}

export interface WorkspaceLanguageFallback {
  default_language?: SupportedLanguage | null;
}

const LANGUAGE_ORDER: readonly SupportedLanguage[] = ["fr", "en", "ar", "tn"];

export function pickLocalizedText(
  node: LocalizedText,
  lang: SupportedLanguage | null | undefined,
  workspace: WorkspaceLanguageFallback
): string {
  const translations = node.translations ?? {};
  const candidates = [lang, workspace.default_language].filter(
    (candidate): candidate is SupportedLanguage => candidate !== null && candidate !== undefined
  );

  for (const candidate of candidates) {
    const translation = translations[candidate]?.trim();
    if (translation) return translation;
  }

  for (const candidate of LANGUAGE_ORDER) {
    const translation = translations[candidate]?.trim();
    if (translation) return translation;
  }

  return node.text ?? "";
}

export function localizeMessageContent<
  T extends {
    text?: string;
    translations?: LanguageTranslations;
    quickReplies?: Array<{ title: string; translations?: LanguageTranslations }>;
    buttons?: Array<{ title: string; translations?: LanguageTranslations }>;
    carousel?: {
      elements: Array<{
        title: string;
        translations?: LanguageTranslations;
        subtitle?: string;
        subtitleTranslations?: LanguageTranslations;
        buttons?: Array<{ title: string; translations?: LanguageTranslations }>;
      }>;
    };
  },
>(
  message: T,
  lang: SupportedLanguage | null | undefined,
  workspace: WorkspaceLanguageFallback
): T {
  return {
    ...message,
    text: pickLocalizedText(message, lang, workspace),
    quickReplies: message.quickReplies?.map((reply) => ({
      ...reply,
      title: pickLocalizedText(
        { text: reply.title, translations: reply.translations },
        lang,
        workspace
      ),
    })),
    buttons: message.buttons?.map((button) => ({
      ...button,
      title: pickLocalizedText(
        { text: button.title, translations: button.translations },
        lang,
        workspace
      ),
    })),
    carousel: message.carousel
      ? {
          ...message.carousel,
          elements: message.carousel.elements.map((element) => ({
            ...element,
            title: pickLocalizedText(
              { text: element.title, translations: element.translations },
              lang,
              workspace
            ),
            subtitle: element.subtitle
              ? pickLocalizedText(
                  { text: element.subtitle, translations: element.subtitleTranslations },
                  lang,
                  workspace
                )
              : undefined,
            buttons: element.buttons?.map((button) => ({
              ...button,
              title: pickLocalizedText(
                { text: button.title, translations: button.translations },
                lang,
                workspace
              ),
            })),
          })),
        }
      : undefined,
  };
}
