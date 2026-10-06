import { describe, expect, it } from "vitest";
import { localizeMessageContent, pickLocalizedText } from "./pick-text";

describe("pickLocalizedText", () => {
  const workspace = { default_language: "fr" as const };

  it("prefers the contact language over the workspace language", () => {
    expect(
      pickLocalizedText(
        { text: "legacy", translations: { en: "Hello", fr: "Bonjour" } },
        "en",
        workspace
      )
    ).toBe("Hello");
  });

  it("falls back to the workspace language and then a stable available language", () => {
    expect(
      pickLocalizedText(
        { text: "legacy", translations: { fr: "Bonjour", tn: "Aslema" } },
        "ar",
        workspace
      )
    ).toBe("Bonjour");
    expect(
      pickLocalizedText({ text: "legacy", translations: { tn: "Aslema" } }, "ar", workspace)
    ).toBe("Aslema");
  });

  it("preserves legacy content when no translation is available", () => {
    expect(pickLocalizedText({ text: "legacy" }, "tn", workspace)).toBe("legacy");
  });

  it("localizes the message and interactive labels before adaptation", () => {
    const localized = localizeMessageContent(
      {
        text: "legacy",
        translations: { ar: "مرحبا" },
        quickReplies: [{ title: "Yes", translations: { tn: "Ey" } }],
        buttons: [{ title: "Buy", translations: { en: "Purchase" } }],
        carousel: {
          elements: [{
            title: "Item",
            translations: { en: "Product" },
            subtitle: "Old subtitle",
            subtitleTranslations: { en: "Details" },
            buttons: [{ title: "Open", translations: { en: "View" } }],
          }],
        },
      },
      "en",
      workspace
    );
    expect(localized.text).toBe("مرحبا");
    expect(localized.quickReplies?.[0].title).toBe("Ey");
    expect(localized.buttons?.[0].title).toBe("Purchase");
    expect(localized.carousel?.elements[0]).toMatchObject({
      title: "Product",
      subtitle: "Details",
      buttons: [{ title: "View" }],
    });
  });
});
