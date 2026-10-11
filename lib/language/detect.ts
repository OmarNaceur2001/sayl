import { ENGLISH_STOP_WORDS, FRENCH_STOP_WORDS } from "./lexicon/latin-stop-words";
import { MSA_ARABIC_STRONG, MSA_ARABIC_WEAK } from "./lexicon/msa-arabic";
import { TUNISIAN_ARABIC_STRONG, TUNISIAN_ARABIC_WEAK } from "./lexicon/tunisian-arabic";
import { TUNISIAN_LATIN_STRONG, TUNISIAN_LATIN_WEAK } from "./lexicon/tunisian-latin";

export type DetectedLanguage = "fr" | "en" | "ar" | "tn" | "unknown";
export type DetectedScript = "latin" | "arabic" | "mixed";

export interface LanguageDetection {
  lang: DetectedLanguage;
  confidence: number;
  script: DetectedScript;
  signals: string[];
  /** True when the rules are not decisive: callers should ask an LLM/classifier. */
  needsFallback?: boolean;
}

const ARABIC_CHARACTERS = /\p{Script=Arabic}/gu;
const LATIN_CHARACTERS = /\p{Script=Latin}/gu;
const WORDS = /[\p{L}\p{N}']+/gu;
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u0640]/gu;
const EMOJI_OR_PUNCTUATION = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{P}\p{S}\s]+$/u;

/** One normalizer for BOTH input text and lexicons (v1 normalized only the input,
 *  so lexicon entries containing hamza such as "أريد" could never match). */
export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ڨڧ]/g, "ق")
    .replace(/ڤ/g, "ف")
    .replace(/پ/g, "ب")
    // elongation: "برشاااا" -> "برشا", "barchaaaa" -> "barcha"
    .replace(/(\p{L})\1{2,}/gu, "$1");
}

interface Lexicon {
  single: Set<string>;
  phrases: string[];
}

function buildLexicon(list: readonly string[]): Lexicon {
  const single = new Set<string>();
  const phrases: string[] = [];
  for (const raw of list) {
    const entry = normalize(raw).trim();
    if (!entry) continue;
    if (entry.includes(" ")) phrases.push(entry);
    else single.add(entry);
  }
  return { single, phrases };
}

const TN_AR_STRONG = buildLexicon(TUNISIAN_ARABIC_STRONG);
const TN_AR_WEAK = buildLexicon(TUNISIAN_ARABIC_WEAK);
const MSA_STRONG = buildLexicon(MSA_ARABIC_STRONG);
const MSA_WEAK = buildLexicon(MSA_ARABIC_WEAK);
const TN_LAT_STRONG = buildLexicon(TUNISIAN_LATIN_STRONG);
const TN_LAT_WEAK = buildLexicon(TUNISIAN_LATIN_WEAK);

const ARABIC_CLITICS = ["و", "ف", "ب", "ل"];

function hasPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "u").test(text);
}

function lexiconHits(
  text: string,
  tokens: string[],
  lexicon: Lexicon,
  stripArabicClitic: boolean
): string[] {
  const hits = new Set<string>();
  for (const token of tokens) {
    if (lexicon.single.has(token)) {
      hits.add(token);
      continue;
    }
    if (stripArabicClitic && /\p{Script=Arabic}/u.test(token)) {
      for (const clitic of ARABIC_CLITICS) {
        if (token.startsWith(clitic) && token.length - clitic.length >= 3) {
          const stem = token.slice(clitic.length);
          if (lexicon.single.has(stem)) hits.add(stem);
        }
      }
    }
  }
  for (const phrase of lexicon.phrases) {
    if (hasPhrase(text, phrase)) hits.add(phrase);
  }
  return [...hits];
}

// Tunisian negation circumfix: "ما ... ش" (ماعنديش، مانيش، ما وصلنيش).
function arabicNegations(tokens: string[]): string[] {
  const hits: string[] = [];
  tokens.forEach((token, index) => {
    if (/^ما\p{Script=Arabic}{2,}ش$/u.test(token)) hits.push(token);
    else if (token === "ما" && /^\p{Script=Arabic}{3,}ش$/u.test(tokens[index + 1] ?? "")) {
      hits.push(`ما ${tokens[index + 1]}`);
    }
  });
  return hits;
}

// Arabizi digits: 2=ء 3=ع 5=خ 6=ط 7=ح 8=غ 9=ق, used inside Latin words.
const TECH_TOKENS = new Set([
  "mp3", "b2b", "b2c", "w3c", "k8s", "n8n", "p2p", "web3", "web2", "o2c", "s3",
  "e2e", "i2c", "ps5", "h2o", "co2",
]);
const ORDINAL_OR_UNIT = /^\d+(am|pm|st|nd|rd|th|k|g|d|h|min|kg|cm|mm|gb|mb|tb|ms|fa|x)$/;
function arabiziTokens(tokens: string[]): string[] {
  return tokens.filter((token) => {
    if (token.length < 3 || TECH_TOKENS.has(token) || ORDINAL_OR_UNIT.test(token)) return false;
    if (!/^[a-z0-9']+$/.test(token)) return false;
    const digits = token.match(/\d/g) ?? [];
    if (digits.length !== 1 || !/[235-9]/.test(digits[0])) return false;
    const letters = token.replace(/[^a-z]/g, "");
    if (letters.length < 2) return false;
    return /(?<=[a-z])[235-9](?=[a-z])|^[235-9](?=[a-z]{2})|(?<=[a-z]{2})[235-9]$/.test(token);
  });
}

function countMatches(text: string, expression: RegExp): number {
  return [...text.matchAll(expression)].length;
}

function stopWordHits(words: string[], lexicon: readonly string[]): string[] {
  const available = new Set(words);
  return lexicon.filter((word) => available.has(word));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function result(
  lang: DetectedLanguage,
  confidence: number,
  script: DetectedScript,
  signals: string[],
  needsFallback: boolean
): LanguageDetection {
  return { lang, confidence: clamp(confidence), script, signals, needsFallback };
}

export function detectLanguage(text: string): LanguageDetection {
  const normalized = normalize(text.trim());
  const arabicCount = countMatches(normalized, ARABIC_CHARACTERS);
  const latinCount = countMatches(normalized, LATIN_CHARACTERS);
  const script: DetectedScript =
    arabicCount > 0 && latinCount > 0 ? "mixed" : arabicCount > 0 ? "arabic" : "latin";

  if (normalized.replace(/\s/gu, "").length < 3 || EMOJI_OR_PUNCTUATION.test(normalized)) {
    return result("unknown", 0.1, script, ["message_too_short_or_nonlinguistic"], true);
  }

  const tokens = normalized.match(WORDS) ?? [];

  // ---- Arabic script (alone or mixed with French words) --------------------
  const arabicRatio = arabicCount / Math.max(1, arabicCount + latinCount);
  if (arabicCount > 0 && arabicRatio >= 0.35) {
    const tnStrong = [
      ...lexiconHits(normalized, tokens, TN_AR_STRONG, true),
      ...arabicNegations(tokens),
    ];
    const tnWeak = lexiconHits(normalized, tokens, TN_AR_WEAK, true);
    const msaStrong = lexiconHits(normalized, tokens, MSA_STRONG, true);
    const msaWeak = lexiconHits(normalized, tokens, MSA_WEAK, true);
    const signals = [
      ...tnStrong.map((hit) => `tn_ar:${hit}`),
      ...tnWeak.map((hit) => `tn_ar_weak:${hit}`),
      ...msaStrong.map((hit) => `ar_msa:${hit}`),
      ...msaWeak.map((hit) => `ar_msa_weak:${hit}`),
    ];
    const tnScore = 2 * tnStrong.length + 0.6 * tnWeak.length;
    const msaScore = 1.5 * msaStrong.length + 0.5 * msaWeak.length;

    if (tnScore > msaScore) {
      return result("tn", 0.55 + Math.min(0.42, (tnScore - msaScore) * 0.1), script, signals,
        tnStrong.length === 0);
    }
    if (msaScore > tnScore) {
      return result("ar", 0.6 + Math.min(0.35, (msaScore - tnScore) * 0.1), script, signals,
        msaStrong.length === 0 || tnScore > 0);
    }
    if (tnScore > 0) {
      return result("unknown", 0.45, script, signals, true); // genuine tie
    }
    // Arabic script, no cue either way (e.g. "السلام عليكم"): MSA by default, ask the fallback.
    return result("ar", 0.6, script, ["arabic_script_default_msa"], true);
  }

  // ---- Latin script: Tunisian Arabizi first, then French / English -------
  const arabizi = arabiziTokens(tokens);
  const latStrong = lexiconHits(normalized, tokens, TN_LAT_STRONG, false);
  const latWeak = lexiconHits(normalized, tokens, TN_LAT_WEAK, false);
  const strongCount = latStrong.length + arabizi.length;
  if (strongCount >= 1 || latWeak.length >= 2) {
    const signals = [
      ...latStrong.map((hit) => `tn_latin:${hit}`),
      ...arabizi.map((hit) => `tn_arabizi:${hit}`),
      ...latWeak.map((hit) => `tn_latin_weak:${hit}`),
    ];
    return result("tn", 0.62 + Math.min(0.33, strongCount * 0.1 + latWeak.length * 0.04), script,
      signals, strongCount === 0);
  }

  const frenchHits = stopWordHits(tokens, FRENCH_STOP_WORDS);
  const englishHits = stopWordHits(tokens, ENGLISH_STOP_WORDS);
  const frenchDiacritics = countMatches(normalized, /[àâçéèêëîïôùûüÿœæ]/gu);
  const frenchScore = frenchHits.length + frenchDiacritics * 2;
  const englishScore = englishHits.length;
  const signalWords = [
    ...frenchHits.map((hit) => `fr:${hit}`),
    ...englishHits.map((hit) => `en:${hit}`),
    ...(frenchDiacritics ? [`fr:diacritics=${frenchDiacritics}`] : []),
    ...latWeak.map((hit) => `tn_latin_weak:${hit}`),
  ];

  if (frenchScore === 0 && englishScore === 0) {
    return result("unknown", 0.2, script, ["no_language_markers"], true);
  }
  if (frenchScore === englishScore) {
    return result("unknown", 0.3, script, signalWords, true);
  }

  const dominant = frenchScore > englishScore ? "fr" : "en";
  const total = frenchScore + englishScore;
  const confidence = 0.52 + 0.45 * (Math.abs(frenchScore - englishScore) / total);
  return result(dominant, confidence, script, signalWords, confidence < 0.7);
}
