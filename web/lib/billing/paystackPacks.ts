/** Credits purchase modal catalog — maps to real backend products only. */

export type ModalPackId = "free" | "basic" | "pro" | "premium" | "topup60" | "topup150";

export type ModalPack = {
  id: ModalPackId;
  credits: number;
  priceGhs: number;
  name: string;
  subtitle: string;
  badge?: string;
  popular?: boolean;
  /** Backend productId for `paystack:initializePayment`. Null = not purchasable. */
  productId: string | null;
  recurring: boolean;
};

export const PAYSTACK_MODAL_PACKS: ModalPack[] = [
  {
    id: "free",
    credits: 25,
    priceGhs: 0,
    name: "Free",
    subtitle: "Starter to explore chat, writing, media",
    badge: "Included",
    productId: null,
    recurring: false,
  },
  {
    id: "basic",
    credits: 100,
    priceGhs: 60,
    name: "Basic",
    subtitle: "100 credits/month (60 GHS) — chat, writing, research & media",
    productId: "sub_basic_monthly",
    recurring: true,
  },
  {
    id: "pro",
    credits: 250,
    priceGhs: 150,
    name: "Pro",
    subtitle: "250 credits/month (150 GHS) for daily creators",
    badge: "Most Popular",
    popular: true,
    productId: "sub_pro_monthly",
    recurring: true,
  },
  {
    id: "premium",
    credits: 500,
    priceGhs: 350,
    name: "Premium",
    subtitle: "500 credits/month (350 GHS) for teams and power users",
    productId: "sub_premium_monthly",
    recurring: true,
  },
  {
    id: "topup60",
    credits: 60,
    priceGhs: 60,
    name: "Top-up 60",
    subtitle: "One-time · 1 GHS = 1 credit",
    productId: "credits_60",
    recurring: false,
  },
  {
    id: "topup150",
    credits: 150,
    priceGhs: 150,
    name: "Top-up 150",
    subtitle: "One-time · 1 GHS = 1 credit",
    productId: "credits_150",
    recurring: false,
  },
];

export const DEFAULT_MODAL_PACK_ID: ModalPackId = "pro";

export function getModalPack(id: ModalPackId): ModalPack {
  return PAYSTACK_MODAL_PACKS.find((p) => p.id === id) ?? PAYSTACK_MODAL_PACKS[2];
}

export type PayMethod = "momo" | "card" | "bank";

export const PAY_METHODS: { id: PayMethod; label: string; detail: string; channels: string[] }[] = [
  { id: "momo", label: "Mobile Money", detail: "MTN · Vodafone · AirtelTigo", channels: ["mobile_money"] },
  { id: "card", label: "Card", detail: "Visa · Mastercard", channels: ["card"] },
  { id: "bank", label: "Bank Transfer", detail: "Bank · USSD", channels: ["bank_transfer", "bank", "ussd"] },
];

export function channelsForPayMethod(method: PayMethod): string[] {
  return PAY_METHODS.find((m) => m.id === method)?.channels ?? ["mobile_money"];
}
