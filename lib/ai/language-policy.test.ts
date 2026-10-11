import { describe, expect, it } from "vitest";
import { buildLanguageInstructions, isSupportedLanguage, resolveReplyLanguage } from "./language-policy";

describe("resolveReplyLanguage", () => {
  it("prefers a forced language over everything", () => {
    expect(resolveReplyLanguage({ override: "en", detected: "tn", conversationLanguage: "fr" })).toBe("en");
  });
  it("treats 'auto' as not forced", () => {
    expect(resolveReplyLanguage({ override: "auto", detected: "tn", conversationLanguage: "fr" })).toBe("tn");
  });
  it("falls back detected > conversation > contact > workspace > fr", () => {
    expect(resolveReplyLanguage({ conversationLanguage: "ar", contactLanguage: "fr" })).toBe("ar");
    expect(resolveReplyLanguage({ contactLanguage: "en", workspaceDefault: "tn" })).toBe("en");
    expect(resolveReplyLanguage({ workspaceDefault: "tn" })).toBe("tn");
    expect(resolveReplyLanguage({})).toBe("fr");
  });
  it("ignores unsupported values", () => {
    expect(resolveReplyLanguage({ override: "es", conversationLanguage: "de", contactLanguage: "ar" })).toBe("ar");
    expect(isSupportedLanguage("tn")).toBe(true);
    expect(isSupportedLanguage("es")).toBe(false);
  });
});

describe("buildLanguageInstructions", () => {
  it("asks for Darija, not MSA, and mirrors Arabizi", () => {
    const text = buildLanguageInstructions("tn", { script: "latin" });
    expect(text).toContain("Tunisian Arabic (Darija), NOT Modern Standard Arabic");
    expect(text).toContain("Arabizi");
    expect(text).toContain("not in Arabic script");
  });
  it("answers in Arabic script when the customer does", () => {
    expect(buildLanguageInstructions("tn", { script: "arabic" })).toContain("Answer in Arabic script");
  });
  it("does not add Tunisian script rules for other languages", () => {
    expect(buildLanguageInstructions("fr", { script: "latin" })).not.toContain("Arabizi");
  });
  it("states a forced language explicitly", () => {
    expect(buildLanguageInstructions("en", { forced: true })).toContain("Always reply in the language described below");
  });
});
