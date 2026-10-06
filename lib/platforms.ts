/**
 * The platforms Sayl can drive. Zernio itself connects many more (TikTok,
 * YouTube, LinkedIn, ads accounts...), but only these expose the DM inbox that
 * flows, sequences and broadcasts are built on, so account sync skips the rest.
 */
export const PLATFORMS = [
  "instagram",
  "facebook",
  "whatsapp",
  "twitter",
  "telegram",
  "bluesky",
  "reddit",
] as const;

export type Platform = (typeof PLATFORMS)[number];

const DEFAULT_ENABLED_PLATFORMS = [
  "whatsapp",
  "instagram",
  "facebook",
  "telegram",
] as const satisfies readonly Platform[];

export function getEnabledPlatforms(
  configuredPlatforms: string | undefined
): Platform[] {
  if (configuredPlatforms === undefined || configuredPlatforms.trim() === "") {
    return [...DEFAULT_ENABLED_PLATFORMS];
  }

  const enabled = new Set(
    configuredPlatforms
      .split(",")
      .map((platform) => platform.trim().toLowerCase())
      .filter((platform): platform is Platform => isSupportedPlatform(platform))
  );

  return PLATFORMS.filter((platform) => enabled.has(platform));
}

export const ENABLED_PLATFORMS = getEnabledPlatforms(
  process.env.NEXT_PUBLIC_ENABLED_CHANNELS
);

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  twitter: "X / Twitter",
  telegram: "Telegram",
  bluesky: "Bluesky",
  reddit: "Reddit",
};

export function isSupportedPlatform(value: unknown): value is Platform {
  return (
    typeof value === "string" && (PLATFORMS as readonly string[]).includes(value)
  );
}

export function platformLabel(platform: string): string {
  return isSupportedPlatform(platform)
    ? PLATFORM_LABELS[platform]
    : platform.charAt(0).toUpperCase() + platform.slice(1);
}
