/** Subscription catalog — amounts overridable via Convex env (PAYSTACK_BASIC_GHS, etc.) */

export const SUBSCRIPTION_PLAN_IDS = ["basic", "pro", "premium"] as const;
export type PaidPlanId = (typeof SUBSCRIPTION_PLAN_IDS)[number];
export type SubscriptionPlanId = PaidPlanId | "free";

export const SUBSCRIPTION_PLANS: Record<
  PaidPlanId,
  {
    id: PaidPlanId;
    productId: string;
    label: string;
    priceGhs: number;
    credits: number;
    description: string;
  }
> = {
  basic: {
    id: "basic",
    productId: "sub_basic_monthly",
    label: "Basic",
    priceGhs: 60,
    credits: 100,
    description: "100 credits/month for chat, writing, research & media.",
  },
  pro: {
    id: "pro",
    productId: "sub_pro_monthly",
    label: "Pro",
    priceGhs: 150,
    credits: 500,
    description: "500 credits/month — best for daily creators.",
  },
  premium: {
    id: "premium",
    productId: "sub_premium_monthly",
    label: "Premium",
    priceGhs: 350,
    credits: 2000,
    description: "2000 credits/month — teams and power users.",
  },
};

export const FREE_STARTER_CREDITS = 25;
export const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function getPlanPriceGhs(planId: PaidPlanId): number {
  const envKey: Record<PaidPlanId, string> = {
    basic: "PAYSTACK_BASIC_GHS",
    pro: "PAYSTACK_PRO_GHS",
    premium: "PAYSTACK_PREMIUM_GHS",
  };
  const fallback = SUBSCRIPTION_PLANS[planId].priceGhs;
  const raw = process.env[envKey[planId]];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function productIdToPlanId(productId: string): PaidPlanId | null {
  for (const plan of SUBSCRIPTION_PLAN_IDS) {
    if (SUBSCRIPTION_PLANS[plan].productId === productId) return plan;
  }
  return null;
}
