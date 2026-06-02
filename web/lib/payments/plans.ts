import type { PaymentProduct } from "./types";
import { FREE_STARTER_CREDITS, SUBSCRIPTION_PLANS } from "./subscriptionCatalog";

export const SUBSCRIPTION_PRODUCTS: PaymentProduct[] = [
  {
    id: SUBSCRIPTION_PLANS.basic.productId,
    label: "Basic",
    description: SUBSCRIPTION_PLANS.basic.description,
    amountGhs: SUBSCRIPTION_PLANS.basic.priceGhs,
    type: "subscription",
    planId: "basic",
    credits: SUBSCRIPTION_PLANS.basic.credits,
  },
  {
    id: SUBSCRIPTION_PLANS.pro.productId,
    label: "Pro",
    description: SUBSCRIPTION_PLANS.pro.description,
    amountGhs: SUBSCRIPTION_PLANS.pro.priceGhs,
    type: "subscription",
    planId: "pro",
    credits: SUBSCRIPTION_PLANS.pro.credits,
    highlighted: true,
  },
  {
    id: SUBSCRIPTION_PLANS.premium.productId,
    label: "Premium",
    description: SUBSCRIPTION_PLANS.premium.description,
    amountGhs: SUBSCRIPTION_PLANS.premium.priceGhs,
    type: "subscription",
    planId: "premium",
    credits: SUBSCRIPTION_PLANS.premium.credits,
  },
];

export const CREDIT_PACKS: PaymentProduct[] = [
  {
    id: "credits_50",
    label: "50 Credits",
    description: "Top-up for any plan.",
    amountGhs: 25,
    type: "credits",
    credits: 50,
  },
  {
    id: "credits_150",
    label: "150 Credits",
    description: "Best value top-up pack.",
    amountGhs: 65,
    type: "credits",
    credits: 150,
    highlighted: true,
  },
  {
    id: "credits_500",
    label: "500 Credits",
    description: "Studio top-up for heavy usage.",
    amountGhs: 199,
    type: "credits",
    credits: 500,
  },
];

export const FREE_TIER_FEATURES = [
  `${FREE_STARTER_CREDITS} starter credits`,
  "Chat · writing · research modes",
  "Image & video (credit-based)",
  "Installable PWA",
] as const;

export const PLAN_FEATURE_HIGHLIGHTS = [
  "Monthly credit refill on renewal",
  "Paystack · Ghana Cedis (GHS)",
  "Webhook-activated subscriptions",
  "Usage logged in Convex",
] as const;

export function getProductById(id: string): PaymentProduct | undefined {
  return [...SUBSCRIPTION_PRODUCTS, ...CREDIT_PACKS].find((p) => p.id === id);
}

export function formatGhs(amount: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(amount);
}
