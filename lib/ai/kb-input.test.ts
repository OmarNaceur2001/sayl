import { describe, expect, it } from "vitest";
import { validateKbDocumentInput } from "./kb-input";

describe("validateKbDocumentInput", () => {
  it("accepts a minimal document and defaults the kind to text", () => {
    expect(validateKbDocumentInput({ title: " Livraison ", text: "7 DT" })).toEqual({
      ok: true,
      value: { title: "Livraison", text: "7 DT", kind: "text", language: null },
    });
  });
  it("accepts faq/csv kinds and a supported language", () => {
    const result = validateKbDocumentInput({ title: "FAQ", text: "Q: a\nA: b", kind: "faq", language: "tn" });
    expect(result).toMatchObject({ ok: true, value: { kind: "faq", language: "tn" } });
  });
  it.each([
    [null, "Invalid body"],
    [{ text: "x" }, "Title is required"],
    [{ title: "x".repeat(201), text: "x" }, "Title is required"],
    [{ title: "x", text: "   " }, "Text is required"],
    [{ title: "x", text: "x".repeat(200_001) }, "too long"],
    [{ title: "x", text: "x", kind: "pdf" }, "Invalid kind"],
    [{ title: "x", text: "x", language: "es" }, "Invalid language"],
  ])("rejects %j", (body, message) => {
    const result = validateKbDocumentInput(body);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });
});
