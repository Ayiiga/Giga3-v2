/** Mirror of convex/subscriptionPlans.ts for UI (amounts shown; charge uses Convex env) */
export const SUBSCRIPTION_PLANS = {
  basic: {
    productId: "sub_basic_monthly",
    label: "Basic",
    priceGhs: 60,
    credits: 60,
    description: "60 credits/month (60 GHS) — chat, writing, research & media.",
  },
  pro: {
    productId: "sub_pro_monthly",
    label: "Pro",
    priceGhs: 150,
    credits: 500,
    description: "500 credits/month for daily creators.",
  },
  premium: {
    productId: "sub_premium_monthly",
    label: "Premium",
    priceGhs: 350,
    credits: 2000,
    description: "2000 credits/month for teams and power users.",
  },
} as const;

export const FREE_STARTER_CREDITS = 25;

export const CREDIT_COSTS = {
  chat: 1,
  writing: 2,
  research: 3,
  image: 2,
  video: 8,
} as const;
