import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "./pricing";

describe("estimateCostUsd", () => {
  it("prices known models per million tokens", () => {
    expect(estimateCostUsd("openai/gpt-4o-mini", 1_000_000, 1_000_000)).toBeCloseTo(0.75, 6);
    expect(estimateCostUsd("openai/gpt-4o-mini", 1_000, 200)).toBeCloseTo(0.00027, 6);
  });
  it("returns null for unknown models instead of guessing", () => {
    expect(estimateCostUsd("acme/unknown", 10, 10)).toBeNull();
  });
});
