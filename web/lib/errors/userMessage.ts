/** Strip sensitive details from errors before showing users or logging client-side. */

const SENSITIVE =
  /sk_(live|test)|Bearer\s|sessionToken|api[_-]?key|password|secret|authorization/i;

const GENERIC = "Something went wrong. Please try again.";

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
  const line = raw.split("\n")[0]?.trim() ?? "";
  if (!line || line.length > 180) return fallback;
  return line;
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
