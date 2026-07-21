/**
 * Opt-in client telemetry stub for Phase 4.
 * Default OFF — no network calls until a sink / DSN is configured.
 *
 * Enable locally: localStorage.setItem("giga3_client_telemetry", "1")
 * Or build-time: NEXT_PUBLIC_GIGA3_CLIENT_TELEMETRY=1
 */

export type ClientTelemetryEvent = {
  name: string;
  level?: "info" | "warn" | "error";
  /** Never include tokens, emails, or secrets. */
  data?: Record<string, string | number | boolean | undefined>;
};

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_GIGA3_CLIENT_TELEMETRY === "1") return true;
  try {
    return localStorage.getItem("giga3_client_telemetry") === "1";
  } catch {
    return false;
  }
}

const SENSITIVE_KEY = /token|password|secret|key|email|authorization|session/i;

function sanitizeData(
  data?: ClientTelemetryEvent["data"]
): Record<string, string | number | boolean> | undefined {
  if (!data) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEY.test(k) || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/** Record a client event. No-op when telemetry is disabled. */
export function reportClientTelemetry(event: ClientTelemetryEvent): void {
  if (!isEnabled()) return;
  const payload = {
    name: event.name.slice(0, 80),
    level: event.level ?? "info",
    data: sanitizeData(event.data),
    ts: Date.now(),
  };
  // Sink placeholder — keep console-only until an approved collector exists.
  if (process.env.NODE_ENV !== "production") {
    console.info("[giga3.telemetry]", payload);
  }
}

export function reportClientError(scope: string, err: unknown): void {
  const message =
    err instanceof Error ? err.message.slice(0, 180) : String(err ?? "").slice(0, 180);
  reportClientTelemetry({
    name: `error.${scope}`,
    level: "error",
    data: { message },
  });
}
