/**
 * Returns `path` when it is a safe in-app redirect target (starts with a single
 * "/" and is not a protocol-relative URL), otherwise `fallback`.
 */
export function safeInternalPath(
  path: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!path) return fallback;
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
