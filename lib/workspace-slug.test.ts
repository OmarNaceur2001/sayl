import { describe, expect, it } from "vitest";
import { generateWorkspaceSlug } from "./workspace-slug";

describe("generateWorkspaceSlug", () => {
  it("slugifies latin names", () => {
    expect(generateWorkspaceSlug("My Team!", "abc12345")).toBe(
      "my-team-abc12345"
    );
    expect(generateWorkspaceSlug("  Acme  Co  ", "abc12345")).toBe(
      "acme-co-abc12345"
    );
  });

  it("falls back for Arabic-only names that slugify to empty", () => {
    const slug = generateWorkspaceSlug("مساحة عملي", "abc12345");
    expect(slug).toBe("workspace-abc12345");
    expect(slug.length).toBeGreaterThan(0);
  });

  it("falls back for empty and symbol-only input", () => {
    expect(generateWorkspaceSlug("", "abc12345")).toBe("workspace-abc12345");
    expect(generateWorkspaceSlug("   ", "abc12345")).toBe("workspace-abc12345");
    expect(generateWorkspaceSlug("---", "abc12345")).toBe("workspace-abc12345");
    expect(generateWorkspaceSlug("💼", "abc12345")).toBe("workspace-abc12345");
  });

  it("produces unique slugs for identical names", () => {
    const first = generateWorkspaceSlug("Duplicate");
    const second = generateWorkspaceSlug("Duplicate");
    expect(first).not.toBe(second);
    expect(first).toMatch(/^duplicate-[0-9a-f]{8}$/);
    expect(second).toMatch(/^duplicate-[0-9a-f]{8}$/);
  });

  it("keeps the suffix so same-name collisions do not reuse a slug", () => {
    expect(generateWorkspaceSlug("Same", "aaaa0000")).not.toBe(
      generateWorkspaceSlug("Same", "bbbb1111")
    );
  });
});
