import type { PaymentProduct } from "./types";
import { CREDIT_PACK_LIST } from "./creditPacksCatalog";
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

export const CREDIT_PACKS: PaymentProduct[] = CREDIT_PACK_LIST.map((pack) => ({
  id: pack.id,
  label: pack.label,
  description: pack.description,
  amountGhs: pack.amountGhs,
  type: "credits" as const,
  credits: pack.credits,
  highlighted: pack.highlighted,
}));

export const FREE_TIER_FEATURES: string[] = [
  `${FREE_STARTER_CREDITS} starter credits`,
  "Chat · writing · research modes",
  "Image & video (credit-based)",
  "Installable PWA",
];

export const PLAN_FEATURE_HIGHLIGHTS: string[] = [
  "Monthly credit refill on renewal",
  "Paystack · Ghana Cedis (GHS)",
  "Webhook-activated subscriptions",
  "Usage logged in Convex",
];

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
