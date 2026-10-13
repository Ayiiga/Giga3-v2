/** Strip sensitive details from errors before showing users or logging client-side. */

const SENSITIVE =
  /sk_(live|test)|Bearer\s|sessionToken|api[_-]?key|password|secret|authorization/i;

/** Leaked backend / Convex internals that must never reach the UI. */
const INTERNAL_LEAK =
  /Request ID|\[CONVEX\b|Uncaught\s+\w*Error|Called by client|\.ts:\d+|convex\/|at\s+(?:async\s+)?[\w.$]+\s*\(/i;

const GENERIC =
  "Something went wrong. Please try again. If it continues, refresh the page.";

/** Exact product copy for the advanced-persona paid-subscription entitlement. */
export const ADVANCED_PERSONA_PAID_PLAN_MESSAGE =
  "This AI feature requires a paid plan. View your options or continue with an available standard AI option.";

/** Free daily tutor/persona allowance exhausted (not a hard paywall). */
export const ADVANCED_PERSONA_DAILY_LIMIT_MESSAGE =
  "You've used today's free tutor questions. Upgrade for unlimited academic help, or continue without a persona.";

export const NETWORK_OFFLINE_MESSAGE =
  "You're offline or the connection dropped. Reconnect and try again.";

/** Remove Convex wrapper noise: Request ID, Server/Error Uncaught *Error:, stacks. */
export function stripConvexErrorNoise(message: string): string {
  let text = message.replace(/\s+/g, " ").trim();
  text = text.replace(/\[CONVEX [^\]]+\]\s*/gi, "");
  text = text.replace(/\[Request ID:\s*[^\]]+\]\s*/gi, "");
  text = text.replace(/\bRequest ID:\s*[a-f0-9]+\b/gi, "");
  // Production often prefixes "Server Error" or bare "Error" before Uncaught …
  text = text.replace(/^Server Error\s+/i, "");
  text = text.replace(
    /^Error\s+Uncaught\s+[A-Za-z0-9_]*Error:\s*/i,
    ""
  );
  text = text.replace(/^Uncaught\s+[A-Za-z0-9_]*Error:\s*/i, "");
  text = text.replace(/^Uncaught Error:\s*/i, "");
  // Drop stack frames, including "(.../convex/file.ts:1:2)" and "../../convex/…"
  text = text.replace(
    /\s+at\s+(?:async\s+)?[\w.$/]+\s*\([^)]*\)[\s\S]*$/i,
    ""
  );
  text = text.replace(/\s+Called by client\s*$/i, "");
  return text.trim();
}

export function isAdvancedPersonaEntitlementMessage(message: string): boolean {
  return (
    /advanced personas require a paid subscription/i.test(message) ||
    message === ADVANCED_PERSONA_PAID_PLAN_MESSAGE ||
    (/requires a paid plan/i.test(message) &&
      /standard AI option/i.test(message))
  );
}

export function isAdvancedPersonaDailyLimitMessage(message: string): boolean {
  return (
    /free tutor questions|free persona questions/i.test(message) ||
    message === ADVANCED_PERSONA_DAILY_LIMIT_MESSAGE
  );
}

export function isNetworkOrOfflineError(err: unknown): boolean {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  return (
    /Failed to fetch|NetworkError|net::ERR_|ECONNRESET|ETIMEDOUT|offline|connection (dropped|lost|failed)/i.test(
      raw
    ) ||
    (typeof navigator !== "undefined" &&
      typeof navigator.onLine === "boolean" &&
      !navigator.onLine &&
      /fetch|network|sync/i.test(raw))
  );
}

function mapProductError(cleaned: string, raw: string): string | null {
  // Never treat network/offline failures as subscription restrictions.
  if (isNetworkOrOfflineError(raw) || isNetworkOrOfflineError(cleaned)) {
    return NETWORK_OFFLINE_MESSAGE;
  }

  if (
    /advanced personas require a paid subscription/i.test(cleaned) ||
    /advanced_personas/i.test(cleaned)
  ) {
    return ADVANCED_PERSONA_PAID_PLAN_MESSAGE;
  }

  if (/free persona questions|free tutor questions/i.test(cleaned)) {
    return ADVANCED_PERSONA_DAILY_LIMIT_MESSAGE;
  }

  if (/Gifts Hub|not unlocked/i.test(cleaned)) {
    return "This creator cannot receive tips yet. Please try again after refreshing.";
  }
  return null;
}

function looksLikeSafeProductCopy(cleaned: string): boolean {
  if (cleaned.length < 12 || cleaned.length > 180) return false;
  if (!/\s/.test(cleaned)) return false;
  if (INTERNAL_LEAK.test(cleaned)) return false;
  // Opaque identifiers / dotted codes (e.g. boom.internal)
  if (/^[a-z0-9_.-]+$/i.test(cleaned)) return false;
  return true;
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
  if (isNetworkOrOfflineError(raw)) {
    return NETWORK_OFFLINE_MESSAGE;
  }
  if (!raw.trim() || SENSITIVE.test(raw)) return fallback;

  // Collapse multiline Convex envelopes before stripping — first-line-only
  // left "[Request ID: …]" as the whole user-visible message.
  const cleaned = stripConvexErrorNoise(raw);
  if (!cleaned) return fallback;

  const mapped = mapProductError(cleaned, raw);
  if (mapped) return mapped;

  const cameFromConvexEnvelope =
    /\[CONVEX\b|Request ID|Uncaught\s+\w*Error|Called by client|\.ts:\d+|convex\//i.test(
      raw
    );

  // Unexpected server/Convex failures → generic actionable copy only.
  if (cameFromConvexEnvelope && !looksLikeSafeProductCopy(cleaned)) {
    return fallback;
  }

  if (INTERNAL_LEAK.test(cleaned) || cleaned.length > 180) return fallback;
  if (!looksLikeSafeProductCopy(cleaned)) return fallback;
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
