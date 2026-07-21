/**
 * Phase 4 production-readiness feature flags.
 * Defaults preserve current UX; localStorage overrides for staged rollout.
 */

export type ProductionFlags = {
  /** Client telemetry (errors / vitals) — default off until DSN / sink is configured. */
  clientTelemetry: boolean;
  /** Extra offline shell recovery messaging — default on. */
  offlineRecoveryHints: boolean;
  /** Prefer safeAsync helpers for new non-critical network paths. */
  safeAsyncNetwork: boolean;
};

export const PRODUCTION_FLAG_DEFAULTS: ProductionFlags = {
  clientTelemetry: false,
  offlineRecoveryHints: true,
  safeAsyncNetwork: true,
};

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
