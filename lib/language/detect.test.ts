import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectLanguage } from "./detect";

describe("detectLanguage", () => {
  it.each([
    ["Bonjour, je voudrais connaître le prix, s'il vous plaît.", "fr"],
    ["Merci, pouvez-vous m'aider avec ma commande ?", "fr"],
    ["Je souhaite réserver une table pour deux personnes.", "fr"],
    ["Votre magasin est ouvert aujourd'hui ?", "fr"],
    ["C'est très gentil, je vous remercie.", "fr"],
    ["Hello, can you help me with my order?", "en"],
    ["What is the price of this product?", "en"],
    ["Please send me the information by email.", "en"],
    ["We are open today until six.", "en"],
    ["Thank you for your help.", "en"],
    ["ماذا تقدم شركتكم من خدمات؟", "ar"],
    ["كيف يمكنني الحصول على المعلومات؟", "ar"],
    ["يرجى إرسال تفاصيل الطلب.", "ar"],
    ["هل لديكم هذا المنتج؟", "ar"],
    ["أريد حجز موعد غداً.", "ar"],
    ["شنية الخدمات اللي تقدموا فيها؟", "tn"],
    ["بقداش سوم المنتج هذا بالله؟", "tn"],
    ["علاش ما وصلنيش طلبي لتوا؟", "tn"],
    ["نحب نعرف وقتاش تفتحوا غدوة.", "tn"],
    ["فما توصيل للمنستير؟", "tn"],
    ["3lech ma jawbtounich?", "tn"],
    ["9adech soum hedha?", "tn"],
    ["n7eb na3ref wa9tech ta3mlou livraison", "tn"],
    ["chnowa les couleurs elli mawjouda?", "tn"],
    ["3aychek barcha, n7eb nbadal l'adresse", "tn"],
  ] as const)("classifies %s as %s", (text, lang) => {
    expect(detectLanguage(text).lang).toBe(lang);
  });

  it.each(["hi", "ok", "👍", "😂😂", "!!!", "??"])(
    "returns unknown for short or non-linguistic text: %s",
    (text) => {
      expect(detectLanguage(text).lang).toBe("unknown");
      expect(detectLanguage(text).confidence).toBeLessThan(0.6);
    }
  );

  it("identifies mixed Arabic and Latin scripts while retaining Tunisian signals", () => {
    const detection = detectLanguage("نحب نعرف price متاعو");
    expect(detection.lang).toBe("tn");
    expect(detection.script).toBe("mixed");
    expect(detection.signals.some((signal) => signal.startsWith("tn_ar:"))).toBe(true);
  });

  it("returns a confidence and traceable signals for detected messages", () => {
    const detection = detectLanguage("Bonjour, merci pour votre aide");
    expect(detection.confidence).toBeGreaterThanOrEqual(0);
    expect(detection.confidence).toBeLessThanOrEqual(1);
    expect(detection.signals.length).toBeGreaterThan(0);
  });

  it("reports labeled fixture accuracy without making it a build gate yet", () => {
    const fixturePath = join(process.cwd(), "tests", "fixtures", "darija-eval.json");
    const samples = JSON.parse(readFileSync(fixturePath, "utf8")) as Array<{
      text: string;
      lang: "fr" | "en" | "ar" | "tn";
    }>;
    const correct = samples.filter((sample) => detectLanguage(sample.text).lang === sample.lang).length;
    const accuracy = correct / samples.length;
    console.info(
      `Language eval fixture: ${correct}/${samples.length} correct (${(accuracy * 100).toFixed(1)}%)`
    );
    expect(samples).toHaveLength(100);
    expect(accuracy).toBeGreaterThan(0);
  });
});

describe("detectLanguage v2 regressions", () => {
  const regression = JSON.parse(
    readFileSync(join(process.cwd(), "tests", "fixtures", "darija-regression.json"), "utf8")
  ) as Array<{ text: string; lang: "fr" | "en" | "ar" | "tn" }>;

  // Synthetic adversarial cases (English words that look like Arabizi, Arabic-script
  // MSA with hamza, digit-Arabizi without a listed word...). Build gate: must stay 100%.
  it.each(regression.map((sample) => [sample.text, sample.lang] as const))(
    "classifies %s as %s",
    (text, lang) => {
      expect(detectLanguage(text).lang).toBe(lang);
    }
  );

  it("keeps the 100-message eval fixture above 95% (build gate)", () => {
    const samples = JSON.parse(
      readFileSync(join(process.cwd(), "tests", "fixtures", "darija-eval.json"), "utf8")
    ) as Array<{ text: string; lang: string }>;
    const correct = samples.filter((s) => detectLanguage(s.text).lang === s.lang).length;
    expect(correct / samples.length).toBeGreaterThanOrEqual(0.95);
  });

  it("matches lexicon entries with hamza after normalization", () => {
    const detection = detectLanguage("أريد حجز موعد");
    expect(detection.lang).toBe("ar");
    expect(detection.signals.some((signal) => signal.startsWith("ar_msa:"))).toBe(true);
  });

  it("asks for a fallback when Arabic script carries no dialect cue", () => {
    expect(detectLanguage("السلام عليكم").needsFallback).toBe(true);
  });

  it("does not treat tech tokens or ordinals as Arabizi", () => {
    for (const text of ["upload the mp3 file", "see you on the 2nd floor", "b2b pricing please"]) {
      expect(detectLanguage(text).lang).not.toBe("tn");
    }
  });
});
