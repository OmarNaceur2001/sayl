import type { KbDocumentKind, SupportedLanguage } from "@/lib/types/database";
import { MAX_KB_TEXT_CHARS } from "./kb-chunking";
import { isSupportedLanguage } from "./language-policy";

export interface KbDocumentInput {
  title: string;
  text: string;
  kind: KbDocumentKind;
  language: SupportedLanguage | null;
}

export type KbInputResult =
  | { ok: true; value: KbDocumentInput }
  | { ok: false; error: string };

const KINDS: readonly KbDocumentKind[] = ["faq", "text", "csv"];

export function validateKbDocumentInput(body: unknown): KbInputResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const { title, text, kind, language } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length < 1 || title.trim().length > 200) {
    return { ok: false, error: "Title is required (max 200 characters)" };
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, error: "Text is required" };
  }
  if (text.length > MAX_KB_TEXT_CHARS) {
    return { ok: false, error: `Text is too long (max ${MAX_KB_TEXT_CHARS} characters)` };
  }
  const resolvedKind = kind === undefined ? "text" : kind;
  if (typeof resolvedKind !== "string" || !KINDS.includes(resolvedKind as KbDocumentKind)) {
    return { ok: false, error: "Invalid kind" };
  }
  if (language !== undefined && language !== null && !isSupportedLanguage(language)) {
    return { ok: false, error: "Invalid language" };
  }

  return {
    ok: true,
    value: {
      title: title.trim(),
      text,
      kind: resolvedKind as KbDocumentKind,
      language: language === undefined || language === null ? null : (language as SupportedLanguage),
    },
  };
}
