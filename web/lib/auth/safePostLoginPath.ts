/**
 * Sanitize post-login redirect targets.
 * Only same-site relative paths are allowed — blocks open redirects.
 */

const DEFAULT_NEXT = "/chat/";

/** Session key used when login CTAs avoid putting `next` in crawlable hrefs. */
export const POST_LOGIN_NEXT_STORAGE_KEY = "giga3_post_login_next";

export function safePostLoginPath(raw: string | null | undefined, fallback = DEFAULT_NEXT): string {
  if (!raw) return fallback;
  let value = raw.trim();
  if (!value) return fallback;

  // Reject absolute URLs and protocol-relative URLs.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) || value.startsWith("//")) {
    return fallback;
  }

  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("\0")) return fallback;

  // Keep path + query; drop hash.
  const hashIdx = value.indexOf("#");
  if (hashIdx >= 0) value = value.slice(0, hashIdx);

  // Normalize login loops back to chat.
  const pathOnly = value.split("?")[0] || "/";
  if (pathOnly === "/chat/login" || pathOnly.startsWith("/chat/login/")) {
    return fallback;
  }

  return value.startsWith("/") ? value : fallback;
}

export function rememberPostLoginPath(nextPath: string): void {
  if (typeof window === "undefined") return;
  const safe = safePostLoginPath(nextPath);
  try {
    sessionStorage.setItem(POST_LOGIN_NEXT_STORAGE_KEY, safe);
  } catch {
    /* ignore quota / private mode */
  }
}

export function consumeRememberedPostLoginPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(POST_LOGIN_NEXT_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(POST_LOGIN_NEXT_STORAGE_KEY);
    return safePostLoginPath(raw);
  } catch {
    return null;
  }
}
