/**
 * Pure helpers for password-reset links — no Convex imports so they can be
 * unit-tested directly.
 */

const DEFAULT_RESET_PATH = "/chat/login/reset";

function safeUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Choose the base URL for a reset link. A client-supplied base is honoured only
 * when its ORIGIN exactly matches FRONTEND_URL (so `https://www.giga3ai.com.evil.com`
 * is rejected — a prefix check would let it through). Loopback origins are
 * allowed only when explicitly enabled for local development.
 */
export function resolveResetBaseUrl(options: {
  requestedBase?: string;
  frontendUrl: string;
  allowLoopback?: boolean;
}): string {
  const frontend = options.frontendUrl.replace(/\/$/, "");
  const fallback = `${frontend}${DEFAULT_RESET_PATH}`;
  const requested = safeUrl(options.requestedBase?.trim());
  if (!requested) return fallback;
  if (requested.protocol !== "https:" && requested.protocol !== "http:") return fallback;
  if (requested.username || requested.password) return fallback;

  const frontendOrigin = safeUrl(frontend)?.origin;
  const sameOrigin = frontendOrigin !== undefined && requested.origin === frontendOrigin;
  const loopback = options.allowLoopback === true && isLoopbackHost(requested.hostname);
  if (!sameOrigin && !loopback) return fallback;

  // Only ever link into the reset route, never an arbitrary path on the origin.
  return `${requested.origin}${DEFAULT_RESET_PATH}`;
}

export function buildResetUrl(base: string, token: string, email: string): string {
  return `${base}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

/** Constant-time equality for equal-length hex digests (avoids early-exit timing leaks). */
export function constantTimeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
