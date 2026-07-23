/**
 * Phase 5 public-beta growth flags.
 * Defaults keep production surfaces unchanged (all product modules OFF).
 * Admins enable groups gradually via remoteConfig; each module is independently reversible.
 *
 * Keys (remoteConfigEntries / DEFAULT_CONFIG):
 * - phase5.beta           — invite codes / waitlist / cohort gating (default off)
 * - phase5.feedback       — expanded feedback types + admin workflow UI (default off)
 * - phase5.creator_success — creator analytics / AI caption helpers (default off)
 * - phase5.education      — school/study communities expansion (default off)
 * - phase5.personalization — optional feed/learning recommendations (default off)
 * - phase5.community_growth — referrals UX / challenges / welcome (default off)
 * - phase5.monetization_beta — creator earnings / boost readiness UI (default off)
 * - phase5.product_analytics — admin product analytics dashboards (default off)
 * - phase5.marketing      — marketing asset surfaces (default off)
 * - phase5.admin_tools    — Phase 5 admin panels (default off; still requires admin auth)
 */

export const PHASE5_FLAG_KEYS = [
  "phase5.beta",
  "phase5.feedback",
  "phase5.creator_success",
  "phase5.education",
  "phase5.personalization",
  "phase5.community_growth",
  "phase5.monetization_beta",
  "phase5.product_analytics",
  "phase5.marketing",
  "phase5.admin_tools",
] as const;

export type Phase5FlagKey = (typeof PHASE5_FLAG_KEYS)[number];

export const PHASE5_FLAG_DEFAULTS: Record<
  Phase5FlagKey,
  { value: string; description: string; enabled: boolean }
> = {
  "phase5.beta": {
    value: "disabled",
    description: "Impl 1 — Public beta invites, waitlist, cohort onboarding",
    enabled: false,
  },
  "phase5.feedback": {
    value: "disabled",
    description: "Impl 2 — Expanded feedback types + admin resolution workflow",
    enabled: false,
  },
  "phase5.creator_success": {
    value: "disabled",
    description: "Impl 3 — Creator analytics, caption/hashtag helpers, badges",
    enabled: false,
  },
  "phase5.education": {
    value: "disabled",
    description: "Impl 4 — School/study communities and learning expansion",
    enabled: false,
  },
  "phase5.personalization": {
    value: "disabled",
    description: "Impl 5 — Optional AI personalization with user consent",
    enabled: false,
  },
  "phase5.community_growth": {
    value: "disabled",
    description: "Impl 6 — Challenges, welcome experience, referral growth UX",
    enabled: false,
  },
  "phase5.monetization_beta": {
    value: "disabled",
    description: "Impl 7 — Creator monetization beta (earnings / boost readiness)",
    enabled: false,
  },
  "phase5.product_analytics": {
    value: "disabled",
    description: "Impl 8 — Admin product analytics (DAU/WAU/retention)",
    enabled: false,
  },
  "phase5.marketing": {
    value: "disabled",
    description: "Impl 9 — Marketing readiness surfaces (stories / release notes)",
    enabled: false,
  },
  "phase5.admin_tools": {
    value: "disabled",
    description: "Phase 5 admin panels (still requires admin auth)",
    enabled: false,
  },
};

/** Resolve whether a Phase 5 flag is active (defaults OFF when unset). */
export async function isPhase5FlagEnabled(
  ctx: { db: { query: (table: string) => any } },
  key: Phase5FlagKey
): Promise<boolean> {
  const def = PHASE5_FLAG_DEFAULTS[key];
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
