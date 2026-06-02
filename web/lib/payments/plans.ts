import type { PaymentProduct } from "./types";

/** GHS pricing — amounts also configurable via Convex env vars at charge time */
export const SUBSCRIPTION_PRODUCTS: PaymentProduct[] = [
  {
    id: "premium_monthly",
    label: "Premium Monthly",
    description:
      "Unlimited chats, credit-based images & videos, Paystack billing in GHS.",
    amountGhs: 49,
    type: "subscription",
    highlighted: true,
  },
];

export const CREDIT_PACKS: PaymentProduct[] = [
  {
    id: "credits_50",
    label: "50 Credits",
    description: "≈25 images or 6 videos (Premium required for video).",
    amountGhs: 25,
    type: "credits",
    credits: 50,
  },
  {
    id: "credits_150",
    label: "150 Credits",
    description: "Best value for creators shipping daily content.",
    amountGhs: 65,
    type: "credits",
    credits: 150,
    highlighted: true,
  },
  {
    id: "credits_500",
    label: "500 Credits",
    description: "Studio pack for teams and agencies.",
    amountGhs: 199,
    type: "credits",
    credits: 500,
  },
];

export const FREE_TIER_FEATURES = [
  "15 chats per day",
  "5 image generations per day",
  "All 10 AI chat modes",
  "No video generation",
] as const;

export const PREMIUM_TIER_FEATURES = [
  "Unlimited chats",
  "Credit-based image generation",
  "Credit-based video generation",
  "Priority media queue",
  "Paystack · Ghana Cedis (GHS)",
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
