import type { Doc } from "./_generated/dataModel";
import type { SubscriptionPlanId } from "./subscriptionPlans";

/** Defaults for users created before credits/subscription fields existed. */
export const USER_FIELD_DEFAULTS = {
  tokens: 12,
  plan: "free",
  tier: "free" as const,
  subscriptionPlan: "free" as const,
  credits: 0,
  starterCreditsGranted: false,
};

const PAID_PLANS = new Set<SubscriptionPlanId>(["basic", "pro", "premium"]);

export function normalizeSubscriptionPlan(
  plan: string | undefined | null,
  subscriptionPlan?: string | null
): SubscriptionPlanId {
  const candidate = subscriptionPlan ?? plan;
  if (candidate && PAID_PLANS.has(candidate as SubscriptionPlanId)) {
    return candidate as SubscriptionPlanId;
  }
  if (candidate === "premium" || plan === "premium") return "premium";
  return "free";
}

export function normalizeTier(
  tier: string | undefined | null,
  plan?: string | null,
  subscriptionPlan?: string | null
): "free" | "premium" {
  if (tier === "premium" || tier === "free") return tier;
  if (plan === "premium" || subscriptionPlan === "premium") return "premium";
  return "free";
}

/** Patches to apply when backfilling legacy user documents. */
export function userBackfillPatch(user: Doc<"users">): Partial<Doc<"users">> {
  const patch: Partial<Doc<"users">> = {};

  if (user.tokens === undefined || user.tokens === null) {
    patch.tokens = USER_FIELD_DEFAULTS.tokens;
  }
  if (user.plan === undefined || user.plan === null || user.plan === "") {
    patch.plan = USER_FIELD_DEFAULTS.plan;
  }
  if (user.credits === undefined || user.credits === null) {
    patch.credits = USER_FIELD_DEFAULTS.credits;
  }
  if (user.tier === undefined || user.tier === null) {
    patch.tier = normalizeTier(user.tier, user.plan, user.subscriptionPlan);
  }
  if (user.subscriptionPlan === undefined || user.subscriptionPlan === null) {
    patch.subscriptionPlan = normalizeSubscriptionPlan(
      user.plan,
      user.subscriptionPlan
    );
  }
  if (
    user.starterCreditsGranted === undefined ||
    user.starterCreditsGranted === null
  ) {
    patch.starterCreditsGranted = USER_FIELD_DEFAULTS.starterCreditsGranted;
  }

  return patch;
}

/** Normalize a user row for API responses (does not write to DB). */
export function withUserDefaults(user: Doc<"users">): Doc<"users"> {
  const patch = userBackfillPatch(user);
  if (Object.keys(patch).length === 0) {
    return user;
  }
  return { ...user, ...patch };
}
