/**
 * Phase 6 Africa launch & ecosystem scale flags.
 * Defaults keep production surfaces unchanged (all modules OFF).
 * Admins enable groups gradually via remoteConfig; each module is independently reversible.
 *
 * Keys:
 * - phase6.multi_region      — country/region config, TZ, regional discovery (default off)
 * - phase6.creator_ecosystem — creator profiles/analytics/campaigns expansion (default off)
 * - phase6.education         — schools/teachers/students expansion (default off)
 * - phase6.org_accounts      — organization & business accounts (default off)
 * - phase6.ai_platform       — AI workspace / translation / productivity (default off)
 * - phase6.commerce          — commerce/payments reporting & reliability (default off)
 * - phase6.operations        — ops monitoring / capacity / incident helpers (default off)
 * - phase6.partnerships      — school/creator/business partnerships (default off)
 * - phase6.compliance        — consent, retention, audit governance (default off)
 * - phase6.admin_tools       — Phase 6 admin panels (default off; still requires admin auth)
 */

export const PHASE6_FLAG_KEYS = [
  "phase6.multi_region",
  "phase6.creator_ecosystem",
  "phase6.education",
  "phase6.org_accounts",
  "phase6.ai_platform",
  "phase6.commerce",
  "phase6.operations",
  "phase6.partnerships",
  "phase6.compliance",
  "phase6.admin_tools",
] as const;

export type Phase6FlagKey = (typeof PHASE6_FLAG_KEYS)[number];

export const PHASE6_FLAG_DEFAULTS: Record<
  Phase6FlagKey,
  { value: string; description: string; enabled: boolean }
> = {
  "phase6.multi_region": {
    value: "disabled",
    description: "Impl 1 — Multi-region config, time zones, regional discovery",
    enabled: false,
  },
  "phase6.creator_ecosystem": {
    value: "disabled",
    description: "Impl 2 — Creator analytics, milestones, campaign readiness",
    enabled: false,
  },
  "phase6.education": {
    value: "disabled",
    description: "Impl 3 — Schools/teachers/students education expansion",
    enabled: false,
  },
  "phase6.org_accounts": {
    value: "disabled",
    description: "Impl 4 — Organization & business accounts",
    enabled: false,
  },
  "phase6.ai_platform": {
    value: "disabled",
    description: "Impl 5 — AI platform enhancements (flagged, cost-monitored)",
    enabled: false,
  },
  "phase6.commerce": {
    value: "disabled",
    description: "Impl 6 — Commerce reporting, payouts visibility, fraud signals",
    enabled: false,
  },
  "phase6.operations": {
    value: "disabled",
    description: "Impl 7 — Ops dashboards, capacity, incident helpers",
    enabled: false,
  },
  "phase6.partnerships": {
    value: "disabled",
    description: "Impl 8 — School/creator/business partnerships & ambassadors",
    enabled: false,
  },
  "phase6.compliance": {
    value: "disabled",
    description: "Impl 9 — Consent, retention, audit governance surfaces",
    enabled: false,
  },
  "phase6.admin_tools": {
    value: "disabled",
    description: "Phase 6 admin panels (still requires admin auth)",
    enabled: false,
  },
};

/** Resolve whether a Phase 6 flag is active (defaults OFF when unset). */
export async function isPhase6FlagEnabled(
  ctx: { db: { query: (table: string) => any } },
  key: Phase6FlagKey
): Promise<boolean> {
  const def = PHASE6_FLAG_DEFAULTS[key];
  try {
    const row = await ctx.db
      .query("remoteConfigEntries")
      .withIndex("by_key", (q: { eq: (field: string, value: string) => unknown }) =>
        q.eq("key", key)
      )
      .first();
    if (!row) return def.enabled;
    return Boolean(row.enabled);
  } catch {
    return def.enabled;
  }
}
