/**
 * Phase 4 controlled-upgrade flags.
 * Defaults keep current production behavior; admins can disable groups without redeploy.
 *
 * Keys (remoteConfigEntries / DEFAULT_CONFIG):
 * - phase4.security      — rate limits & write protection (default on)
 * - phase4.monitoring    — security/health admin visibility (default on)
 * - phase4.offline       — offline recovery hints / SW-aware UX (default on)
 * - phase4.admin_tools   — Phase 4 admin panels (default on = restricted admins only via auth)
 * - phase4.reliability   — safeAsync / recovery helpers preference (default on)
 *
 * Env override (force-off only): GIGA3_SOCIAL_WRITE_RATE_LIMIT=false
 */

export const PHASE4_FLAG_KEYS = [
  "phase4.security",
  "phase4.monitoring",
  "phase4.offline",
  "phase4.admin_tools",
  "phase4.reliability",
] as const;

export type Phase4FlagKey = (typeof PHASE4_FLAG_KEYS)[number];

export const PHASE4_FLAG_DEFAULTS: Record<
  Phase4FlagKey,
  { value: string; description: string; enabled: boolean }
> = {
  "phase4.security": {
    value: "enabled",
    description: "Release Group 1 — social write rate limits & upload hardening active",
    enabled: true,
  },
  "phase4.monitoring": {
    value: "enabled",
    description: "Release Group 1 — security events & system health surfaces",
    enabled: true,
  },
  "phase4.offline": {
    value: "enabled",
    description: "Release Group 2 — offline recovery hints (SW v170 remains installed)",
    enabled: true,
  },
  "phase4.admin_tools": {
    value: "restricted",
    description: "Release Group 3 — Phase 4 admin panels (still requires admin auth)",
    enabled: true,
  },
  "phase4.reliability": {
    value: "enabled",
    description: "Release Group 2 — client recovery helpers / safeAsync preference",
    enabled: true,
  },
};

/** Resolve whether a Phase 4 flag is active (defaults on when unset). */
export async function isPhase4FlagEnabled(
  ctx: { db: { query: (table: string) => any } },
  key: Phase4FlagKey
): Promise<boolean> {
  const def = PHASE4_FLAG_DEFAULTS[key];
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
