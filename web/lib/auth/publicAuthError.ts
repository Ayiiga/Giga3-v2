import { stripConvexErrorNoise } from "@/lib/errors/userMessage";

/**
 * User-facing auth errors. Strips Convex wrappers, stack paths, tokens and JWTs
 * so a failed sign-in cannot leak Request IDs or server file paths into the UI.
 */
export function publicAuthErrorMessage(
  err: unknown,
  fallback = "Could not complete sign in.",
  secrets: string[] = []
): string {
  let raw = err instanceof Error ? err.message : typeof err === "string" ? err : fallback;
  for (const secret of secrets) {
    if (secret.trim().length >= 8) raw = raw.split(secret).join("[redacted]");
  }
  raw = raw.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]");
  if (/token=|password=/i.test(raw)) {
    return fallback;
  }
  const cleaned = stripConvexErrorNoise(raw.split("\n")[0] ?? "");
  if (!cleaned.trim() || cleaned.length > 180) {
    return fallback;
  }
  // Never surface absolute/relative server paths from stack frames that survived stripping.
  if (/\.ts:\d+|convex\//i.test(cleaned)) {
    return fallback;
  }
  return cleaned;
}
