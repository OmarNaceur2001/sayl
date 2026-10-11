import { describe, expect, it } from "vitest";
import { countMessagesByLanguage } from "./analytics";

describe("countMessagesByLanguage", () => {
  it("counts each supported language and unknown-language messages", () => {
    expect(
      countMessagesByLanguage([
        { language: "fr" },
        { language: "fr" },
        { language: "en" },
        { language: "ar" },
        { language: "tn" },
        { language: null },
      ])
    ).toEqual({ fr: 2, en: 1, ar: 1, tn: 1, unknown: 1 });
  });

  it("returns zero counts for an empty set", () => {
    expect(countMessagesByLanguage([])).toEqual({
      fr: 0,
      en: 0,
      ar: 0,
      tn: 0,
      unknown: 0,
    });
  });
});
