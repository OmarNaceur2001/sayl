import { describe, expect, it } from "vitest";
import {
  MAX_CHUNKS_PER_DOCUMENT,
  buildChunks,
  chunkPlainText,
  csvToChunks,
  parseCsv,
  parseFaq,
} from "./kb-chunking";

describe("chunkPlainText", () => {
  it("merges short paragraphs and splits long ones under the limit", () => {
    const chunks = chunkPlainText("Horaires: 9h-18h.\n\nLivraison: 7 DT.", 800);
    expect(chunks).toEqual(["Horaires: 9h-18h.\n\nLivraison: 7 DT."]);
    const long = chunkPlainText(`${"Phrase de test. ".repeat(200)}`, 300);
    expect(long.length).toBeGreaterThan(5);
    expect(long.every((chunk) => chunk.length <= 300)).toBe(true);
  });
  it("hard-splits a single huge token", () => {
    expect(chunkPlainText("x".repeat(2000), 800).every((c) => c.length <= 800)).toBe(true);
  });
});

describe("parseFaq", () => {
  it("parses Q/A pairs, including multi-line answers", () => {
    const chunks = parseFaq("Q: Livraison à Sfax ?\nA: Oui, 7 DT.\nDélai 48h.\n\nQ: Retour ?\nA: 7 jours.");
    expect(chunks).toEqual(["Q: Livraison à Sfax ?\nA: Oui, 7 DT. Délai 48h.", "Q: Retour ?\nA: 7 jours."]);
  });
  it("understands French and Arabic labels", () => {
    expect(parseFaq("Question: Prix ?\nRéponse: 89 DT")).toEqual(["Q: Prix ?\nA: 89 DT"]);
    expect(parseFaq("السؤال: بقداش؟\nالجواب: 89 دينار")).toEqual(["Q: بقداش؟\nA: 89 دينار"]);
  });
  it("returns nothing when there is no pair", () => {
    expect(parseFaq("juste du texte")).toEqual([]);
  });
});

describe("parseCsv / csvToChunks", () => {
  it("handles quotes, escaped quotes and semicolons", () => {
    const rows = parseCsv('question;answer\n"Prix, TTC ?";"89 ""DT"""\n');
    expect(rows).toEqual([["question", "answer"], ["Prix, TTC ?", '89 "DT"']]);
  });
  it("turns question/answer columns into FAQ chunks", () => {
    expect(csvToChunks("question,réponse\nLivraison ?,7 DT\n,vide")).toEqual(["Q: Livraison ?\nA: 7 DT"]);
  });
  it("turns catalog rows into 'column: value' chunks", () => {
    expect(csvToChunks("produit,prix,stock\nRobe,89,12\nSac,45,")).toEqual([
      "produit: Robe; prix: 89; stock: 12",
      "produit: Sac; prix: 45",
    ]);
  });
});

describe("buildChunks", () => {
  it("falls back to plain text when a 'faq' document has no Q/A markers", () => {
    expect(buildChunks("faq", "Livraison gratuite dès 100 DT.").chunks).toHaveLength(1);
  });
  it("caps the number of chunks and reports truncation", () => {
    const csv = `a,b\n${Array.from({ length: MAX_CHUNKS_PER_DOCUMENT + 20 }, (_, i) => `x${i},y`).join("\n")}`;
    const built = buildChunks("csv", csv);
    expect(built.chunks).toHaveLength(MAX_CHUNKS_PER_DOCUMENT);
    expect(built.truncated).toBe(true);
  });
});
