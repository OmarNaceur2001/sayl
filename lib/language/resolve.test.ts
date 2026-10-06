import { describe, expect, it } from "vitest";
import type { LanguageDetection } from "./detect";
import { resolveContactLanguage } from "./resolve";

const workspace = { default_language: "fr" as const };
const detected = (lang: "fr" | "en" | "ar" | "tn", confidence = 0.9): LanguageDetection => ({
  lang,
  confidence,
  script: lang === "ar" || lang === "tn" ? "arabic" : "latin",
  signals: ["test"],
});

describe("resolveContactLanguage", () => {
  it("uses a confident first detection for an unclassified contact", () => {
    const result = resolveContactLanguage(
      { language: null, language_confidence: null, language_source: null },
      workspace,
      detected("tn")
    );
    expect(result.contactLanguage).toBe("tn");
    expect(result.languageSource).toBe("detected");
    expect(result.shouldUpdateContact).toBe(true);
  });

  it("keeps the workspace default when detection is weak", () => {
    const result = resolveContactLanguage(
      { language: null, language_confidence: null, language_source: null },
      workspace,
      detected("en", 0.59)
    );
    expect(result.contactLanguage).toBe("fr");
    expect(result.languageSource).toBe("default");
    expect(result.shouldUpdateContact).toBe(false);
  });

  it("never overwrites a manual contact language", () => {
    const result = resolveContactLanguage(
      { language: "en", language_confidence: 1, language_source: "manual" },
      workspace,
      detected("tn"),
      "tn"
    );
    expect(result.contactLanguage).toBe("en");
    expect(result.languageSource).toBe("manual");
    expect(result.conversationLanguage).toBe("tn");
    expect(result.shouldUpdateContact).toBe(false);
  });

  it("requires a repeated alternative on the previous conversation to change detected language", () => {
    const contact = {
      language: "fr" as const,
      language_confidence: 0.8,
      language_source: "detected" as const,
    };
    expect(resolveContactLanguage(contact, workspace, detected("en"), "fr").contactLanguage).toBe("fr");
    const repeated = resolveContactLanguage(contact, workspace, detected("en"), "en");
    expect(repeated.contactLanguage).toBe("en");
    expect(repeated.languageSource).toBe("detected");
    expect(repeated.shouldUpdateContact).toBe(true);
  });

  it("keeps the previous conversation language for unknown detections", () => {
    const unknown: LanguageDetection = {
      lang: "unknown",
      confidence: 0.1,
      script: "latin",
      signals: [],
    };
    const result = resolveContactLanguage(
      { language: "ar", language_confidence: 0.8, language_source: "detected" },
      workspace,
      unknown,
      "tn"
    );
    expect(result.conversationLanguage).toBe("tn");
    expect(result.contactLanguage).toBe("ar");
  });
});
