import type { SubscriptionPlanId } from "./subscriptionPlans";

/** Credits charged per AI action */
export const CREDIT_COSTS = {
  chat: 1,
  writing: 2,
  research: 3,
  image: 2,
  video: 8,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** Map chat mode → credit action category */
export function creditActionForMode(mode: string): CreditAction {
  const writingModes = new Set(["homework", "resume", "book", "social", "gigalearn"]);
  const researchModes = new Set(["research", "university", "waec", "news"]);
  if (writingModes.has(mode)) return "writing";
  if (researchModes.has(mode)) return "research";
  return "chat";
}

export function isSubscriptionActive(
  plan: SubscriptionPlanId,
  subscriptionExpiresAt?: number | null
): boolean {
  if (plan === "free") return false;
  if (!subscriptionExpiresAt) return false;
  return subscriptionExpiresAt > Date.now();
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
