const FALLBACK_BASE = "workspace";

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export function generateWorkspaceSlug(
  name: string,
  suffix: string = randomSuffix()
): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || FALLBACK_BASE;

  return `${base}-${suffix}`;
}
