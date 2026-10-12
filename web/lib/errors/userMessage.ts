/** Strip sensitive details from errors before showing users or logging client-side. */

const SENSITIVE =
  /sk_(live|test)|Bearer\s|sessionToken|api[_-]?key|password|secret|authorization/i;

/** Leaked backend / Convex internals that must never reach the UI. */
const INTERNAL_LEAK =
  /Request ID|\[CONVEX\b|Uncaught\s+\w*Error|Called by client|\.ts:\d+|convex\/|at\s+\w+\s*\(/i;

const GENERIC = "Something went wrong. Please try again.";

const PERSONA_LIMIT_MESSAGE =
  "You've used today's free tutor questions. Upgrade for unlimited academic help, or continue without a persona.";

const PERSONA_UPGRADE_MESSAGE =
  "Academic tutors include a free daily allowance. Upgrade for unlimited help, or continue without a persona.";

/** Remove Convex wrapper noise: [CONVEX M(...)] [Request ID: ...] Server Error Uncaught Error: */
export function stripConvexErrorNoise(message: string): string {
  let text = message.replace(/\s+/g, " ").trim();
  text = text.replace(/\[CONVEX [^\]]+\]\s*/gi, "");
  text = text.replace(/\[Request ID:\s*[^\]]+\]\s*/gi, "");
  text = text.replace(/\bRequest ID:\s*[a-f0-9]+\b/gi, "");
  text = text.replace(/^Server Error\s*/i, "");
  // Convex wraps thrown Errors as "Uncaught Error:" or "Uncaught UnauthorizedError:" etc.
  text = text.replace(/^Uncaught [A-Za-z0-9_]+Error:\s*/i, "");
  text = text.replace(/^Uncaught Error:\s*/i, "");
  // Drop stack frames: "at requireFeature (../../convex/entitlements.ts:108:8) ..."
  text = text.replace(/\s+at\s+(?:async\s+)?[\w.$/]+\s*\([^)]*\)[\s\S]*$/i, "");
  text = text.replace(/\s+at\s+handler\s*\([^)]*\)[\s\S]*$/i, "");
  text = text.replace(/\s+Called by client\s*$/i, "");
  return text.trim();
}

function mapProductError(cleaned: string): string | null {
  if (
    /free persona questions|free tutor questions|advanced personas|advanced_personas/i.test(
      cleaned
    )
  ) {
    if (/used all|used today|for today/i.test(cleaned)) {
      return PERSONA_LIMIT_MESSAGE;
    }
    return PERSONA_UPGRADE_MESSAGE;
  }
  if (/Gifts Hub|not unlocked/i.test(cleaned)) {
    return "This creator cannot receive tips yet. Please try again after refreshing.";
  }
  return null;
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

  // Collapse multiline Convex envelopes before stripping — first-line-only
  // left "[Request ID: …]" as the whole user-visible message.
  const cleaned = stripConvexErrorNoise(raw);
  if (!cleaned) return fallback;

  const mapped = mapProductError(cleaned);
  if (mapped) return mapped;

  if (INTERNAL_LEAK.test(cleaned) || cleaned.length > 180) return fallback;
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
