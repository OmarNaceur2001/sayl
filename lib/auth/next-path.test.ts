import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./next-path";

describe("safeInternalPath", () => {
  it("allows internal paths", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/reset-password?e=1")).toBe("/reset-password?e=1");
    expect(safeInternalPath("/")).toBe("/");
  });

  it("falls back for missing or empty values", () => {
    expect(safeInternalPath(null)).toBe("/dashboard");
    expect(safeInternalPath(undefined)).toBe("/dashboard");
    expect(safeInternalPath("")).toBe("/dashboard");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeInternalPath("https://evil.com")).toBe("/dashboard");
    expect(safeInternalPath("//evil.com/x")).toBe("/dashboard");
    expect(safeInternalPath("evil.com")).toBe("/dashboard");
    expect(safeInternalPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("honors a custom fallback", () => {
    expect(safeInternalPath("https://evil.com", "/login")).toBe("/login");
  });
});
