export function hasValidCronAuthorization(
  authorization: string | null,
  cronSecret: string | undefined
): boolean {
  if (!cronSecret) {
    return false;
  }

  const providedSecret = /^Bearer\s+(\S+)$/i.exec(authorization ?? "")?.[1];
  return providedSecret === cronSecret;
}
