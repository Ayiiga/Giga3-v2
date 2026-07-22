/** Strip sensitive details from errors before showing users or logging client-side. */

const SENSITIVE =
  /sk_(live|test)|Bearer\s|sessionToken|api[_-]?key|password|secret|authorization/i;

const GENERIC = "Something went wrong. Please try again.";

/** Remove Convex wrapper noise: [CONVEX M(...)] [Request ID: ...] Server Error Uncaught Error: */
export function stripConvexErrorNoise(message: string): string {
  let text = message.replace(/\s+/g, " ").trim();
  text = text.replace(/\[CONVEX [^\]]+\]\s*/gi, "");
  text = text.replace(/\[Request ID:\s*[^\]]+\]\s*/gi, "");
  text = text.replace(/^Server Error\s*/i, "");
  text = text.replace(/^Uncaught Error:\s*/i, "");
  text = text.replace(/\s+at handler\s*\([^)]*\)[\s\S]*$/i, "");
  text = text.replace(/\s+Called by client\s*$/i, "");
  return text.trim();
}

export function toUserFacingError(
  err: unknown,
  fallback = GENERIC
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  if (/Loading chunk [\d]+ failed/i.test(raw) || /ChunkLoadError/i.test(raw)) {
    return "The app was updated. Please refresh the page to load the latest version.";
  }
  if (!raw.trim() || SENSITIVE.test(raw)) return fallback;
  const cleaned = stripConvexErrorNoise(raw.split("\n")[0] ?? "");
  if (!cleaned || cleaned.length > 180) return fallback;
  if (/Gifts Hub|not unlocked/i.test(cleaned)) {
    return "This creator cannot receive tips yet. Please try again after refreshing.";
  }
  return cleaned;
}

export function logClientDiagnostic(
  scope: string,
  detail: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const safe: Record<string, unknown> = { scope, ts: Date.now() };
  for (const [key, value] of Object.entries(detail)) {
    if (/token|password|secret|key|email/i.test(key)) continue;
    if (typeof value === "string" && SENSITIVE.test(value)) continue;
    safe[key] = value;
  }
  if (process.env.NODE_ENV !== "production") {
    console.info("[giga3]", safe);
  }
}
