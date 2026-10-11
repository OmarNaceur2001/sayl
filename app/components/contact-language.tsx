"use client";

import { useEffect, useState } from "react";
import type { SupportedLanguage } from "@/lib/types/database";

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  "fr",
  "en",
  "ar",
  "tn",
];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
  tn: "الدارجة التونسية",
};

export function ContactLanguage({
  contactId,
  language,
  editable = false,
  onLanguageChange,
}: {
  contactId: string;
  language: SupportedLanguage | null;
  editable?: boolean;
  onLanguageChange?: (language: SupportedLanguage) => void;
}) {
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCurrentLanguage(language), [language]);

  async function updateLanguage(nextLanguage: SupportedLanguage) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/contacts/${contactId}/language`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: nextLanguage }),
      });
      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);
        const message =
          result && typeof result === "object" && "error" in result
            ? String(result.error)
            : "Could not update language";
        throw new Error(message);
      }

      setCurrentLanguage(nextLanguage);
      onLanguageChange?.(nextLanguage);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not update language";
      setError(message);
      console.error("Failed to update contact language:", cause);
    } finally {
      setSaving(false);
    }
  }

  if (editable) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`contact-language-${contactId}`} className="text-xs text-muted-foreground">
          Language
        </label>
        <select
          id={`contact-language-${contactId}`}
          value={currentLanguage ?? ""}
          disabled={saving}
          onChange={(event) => {
            const nextLanguage = event.target.value as SupportedLanguage;
            if (SUPPORTED_LANGUAGES.includes(nextLanguage)) {
              void updateLanguage(nextLanguage);
            }
          }}
          className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground disabled:opacity-60"
        >
          <option value="" disabled>Select language</option>
          {SUPPORTED_LANGUAGES.map((option) => (
            <option key={option} value={option}>
              {LANGUAGE_LABELS[option]}
            </option>
          ))}
        </select>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
        {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  if (!currentLanguage) return null;
  return (
    <span
      className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
      title={LANGUAGE_LABELS[currentLanguage]}
    >
      {currentLanguage.toUpperCase()}
    </span>
  );
}
