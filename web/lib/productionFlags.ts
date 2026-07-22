/**
 * Phase 4 production-readiness feature flags (client).
 * Defaults preserve current UX; localStorage overrides for staged rollout.
 * Server-side kill switches live in Convex remoteConfig (phase4.*).
 */

export type ProductionFlags = {
  /** Client telemetry (errors / vitals) — default off until DSN / sink is configured. */
  clientTelemetry: boolean;
  /** Extra offline shell recovery messaging — default on (phase4.offline). */
  offlineRecoveryHints: boolean;
  /** Prefer safeAsync helpers for new non-critical network paths (phase4.reliability). */
  safeAsyncNetwork: boolean;
  /** Aligns with remote phase4.monitoring — allows client diagnostic hooks. */
  monitoringHints: boolean;
};

export const PRODUCTION_FLAG_DEFAULTS: ProductionFlags = {
  clientTelemetry: false,
  offlineRecoveryHints: true,
  safeAsyncNetwork: true,
  monitoringHints: true,
};

/** Maps client flags to remote Phase 4 release-group keys (documentation / sync). */
export const PRODUCTION_FLAG_REMOTE_KEYS = {
  offlineRecoveryHints: "phase4.offline",
  safeAsyncNetwork: "phase4.reliability",
  monitoringHints: "phase4.monitoring",
  clientTelemetry: "phase4.monitoring",
} as const;

const STORAGE_KEY = "giga3_production_flags_v1";

function readStored(): Partial<ProductionFlags> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ProductionFlags>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getProductionFlags(): ProductionFlags {
  return { ...PRODUCTION_FLAG_DEFAULTS, ...readStored() };
}

export function isProductionFlagEnabled(key: keyof ProductionFlags): boolean {
  return Boolean(getProductionFlags()[key]);
}

/**
 * Merge remote phase4.* entries into client flags when available.
 * Missing remote keys leave defaults intact — safe for gradual rollout.
 */
export function mergeRemotePhase4Flags(
  remote: Record<string, { enabled: boolean; value: string }> | undefined
): ProductionFlags {
  const base = getProductionFlags();
  if (!remote) return base;
  const offline = remote["phase4.offline"];
  const reliability = remote["phase4.reliability"];
  const monitoring = remote["phase4.monitoring"];
  return {
    ...base,
    offlineRecoveryHints: offline ? offline.enabled : base.offlineRecoveryHints,
    safeAsyncNetwork: reliability ? reliability.enabled : base.safeAsyncNetwork,
    monitoringHints: monitoring ? monitoring.enabled : base.monitoringHints,
    // Telemetry stays opt-in via env/localStorage even when monitoring is on.
    clientTelemetry: base.clientTelemetry,
  };
}
