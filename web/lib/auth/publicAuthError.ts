/**
 * User-facing auth errors. Strips tokens and JWTs so a provider message
 * cannot echo a credential into the page.
 */
export function publicAuthErrorMessage(
  err: unknown,
  fallback = "Could not complete sign in.",
  secrets: string[] = []
): string {
  let raw = err instanceof Error ? err.message : fallback;
  for (const secret of secrets) {
    if (secret.trim().length >= 8) raw = raw.split(secret).join("[redacted]");
  }
  raw = raw.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]");
  if (!raw.trim() || raw.length > 240 || /token=|password=/i.test(raw)) {
    return fallback;
  }
  return raw;
}
