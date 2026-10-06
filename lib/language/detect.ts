import { ENGLISH_STOP_WORDS, FRENCH_STOP_WORDS } from "./lexicon/latin-stop-words";
import { MSA_ARABIC_MARKERS } from "./lexicon/msa-arabic";
import { TUNISIAN_ARABIC_MARKERS } from "./lexicon/tunisian-arabic";
import { TUNISIAN_LATIN_MARKERS } from "./lexicon/tunisian-latin";

export type DetectedLanguage = "fr" | "en" | "ar" | "tn" | "unknown";
export type DetectedScript = "latin" | "arabic" | "mixed";

export interface LanguageDetection {
  lang: DetectedLanguage;
  confidence: number;
  script: DetectedScript;
  signals: string[];
}

const ARABIC_CHARACTERS = /\p{Script=Arabic}/gu;
const LATIN_CHARACTERS = /\p{Script=Latin}/gu;
const WORDS = /[\p{L}\p{N}']+/gu;
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/gu;
const EMOJI_OR_PUNCTUATION = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{P}\p{S}\s]+$/u;

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي");
}

function countMatches(text: string, expression: RegExp): number {
  return [...text.matchAll(expression)].length;
}

function markerHits(text: string, markers: readonly string[]): string[] {
  return markers.filter((marker) => {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "u").test(text);
  });
}

function stopWordHits(words: string[], lexicon: readonly string[]): string[] {
  const available = new Set(words);
  return lexicon.filter((word) => available.has(word));
}

function result(
  lang: DetectedLanguage,
  confidence: number,
  script: DetectedScript,
  signals: string[]
): LanguageDetection {
  return { lang, confidence: Math.max(0, Math.min(1, confidence)), script, signals };
}

export function detectLanguage(text: string): LanguageDetection {
  const normalized = normalize(text.trim());
  const arabicCount = countMatches(normalized, ARABIC_CHARACTERS);
  const latinCount = countMatches(normalized, LATIN_CHARACTERS);
  const script: DetectedScript =
    arabicCount > 0 && latinCount > 0
      ? "mixed"
      : arabicCount > 0
        ? "arabic"
        : "latin";

  if (normalized.replace(/\s/gu, "").length < 3 || EMOJI_OR_PUNCTUATION.test(normalized)) {
    return result("unknown", 0.1, script, ["message_too_short_or_nonlinguistic"]);
  }

  const arabicRatio = arabicCount / Math.max(1, arabicCount + latinCount);
  if (arabicCount > 0 && arabicRatio >= 0.35) {
    const darijaHits = markerHits(normalized, TUNISIAN_ARABIC_MARKERS);
    const msaHits = markerHits(normalized, MSA_ARABIC_MARKERS);
    const signals = [
      ...darijaHits.map((hit) => `tn_ar:${hit}`),
      ...msaHits.map((hit) => `ar_msa:${hit}`),
    ];
    if (darijaHits.length > msaHits.length) {
      return result("tn", 0.62 + Math.min(0.34, darijaHits.length * 0.08), script, signals);
    }
    if (msaHits.length > 0) {
      return result("ar", 0.66 + Math.min(0.3, msaHits.length * 0.08), script, signals);
    }
    return result("ar", 0.6, script, ["arabic_script_default_msa"]);
  }

  const latinHits = markerHits(normalized, TUNISIAN_LATIN_MARKERS);
  if (latinHits.length > 0) {
    return result("tn", 0.64 + Math.min(0.32, latinHits.length * 0.08), script,
      latinHits.map((hit) => `tn_latin:${hit}`));
  }

  const words = normalized.match(WORDS) ?? [];
  const frenchHits = stopWordHits(words, FRENCH_STOP_WORDS);
  const englishHits = stopWordHits(words, ENGLISH_STOP_WORDS);
  const frenchDiacritics = countMatches(normalized, /[àâçéèêëîïôùûüÿœæ]/gu);
  const frenchScore = frenchHits.length + frenchDiacritics * 2;
  const englishScore = englishHits.length;
  const signalWords = [
    ...frenchHits.map((hit) => `fr:${hit}`),
    ...englishHits.map((hit) => `en:${hit}`),
    ...(frenchDiacritics ? [`fr:diacritics=${frenchDiacritics}`] : []),
  ];

  if (frenchScore === 0 && englishScore === 0) {
    return result("unknown", 0.2, script, ["no_language_markers"]);
  }

  const dominant = frenchScore >= englishScore ? "fr" : "en";
  const total = frenchScore + englishScore;
  const confidence = 0.52 + 0.45 * (Math.abs(frenchScore - englishScore) / total);
  return result(dominant, confidence, script, signalWords);
}
