import { stripConvexErrorNoise } from "@/lib/errors/userMessage";

export const INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password.";

export const INVALID_CREDENTIALS_RESET_HINT =
  "Forgot your password? Use Forgot password above to reset it.";

/** Full public copy for a failed password sign-in with invalid credentials. */
export const INVALID_CREDENTIALS_PUBLIC_MESSAGE = `${INVALID_CREDENTIALS_MESSAGE} ${INVALID_CREDENTIALS_RESET_HINT}`;

export function isInvalidCredentialsMessage(message: string): boolean {
  return /incorrect email or password/i.test(message);
}

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

  const cleaned = stripConvexErrorNoise(raw);
  if (!cleaned.trim()) {
    return fallback;
  }

  if (isInvalidCredentialsMessage(cleaned)) {
    return INVALID_CREDENTIALS_PUBLIC_MESSAGE;
  }

  // Preserve short field / product validation messages; never show internals.
  if (
    /\.ts:\d+|convex\/|Request ID|Uncaught\s+\w*Error|authPasswordActions|\[CONVEX/i.test(
      cleaned
    ) ||
    cleaned.length > 180
  ) {
    return fallback;
  }
  return cleaned;
}
