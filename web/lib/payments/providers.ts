/**
 * Payment provider abstraction — Paystack is active in production.
 * Additional providers are registered for future interchangeable checkout.
 */

export type PaymentProviderId =
  | "paystack"
  | "stripe"
  | "paypal"
  | "mobile_money";

export type PaymentProviderDescriptor = {
  id: PaymentProviderId;
  label: string;
  available: boolean;
  regions: string[];
  description: string;
};

export const PAYMENT_PROVIDERS: PaymentProviderDescriptor[] = [
  {
    id: "paystack",
    label: "Paystack",
    available: true,
    regions: ["GH", "NG", "ZA", "KE"],
    description: "Cards, mobile money, and bank transfers in Ghana Cedis.",
  },
  {
    id: "stripe",
    label: "Stripe",
    available: false,
    regions: ["Global"],
    description: "International card payments (planned).",
  },
  {
    id: "paypal",
    label: "PayPal",
    available: false,
    regions: ["Global"],
    description: "PayPal wallet checkout (planned).",
  },
  {
    id: "mobile_money",
    label: "Mobile Money",
    available: false,
    regions: ["GH"],
    description: "Direct MTN / Telecel / AirtelTigo rails (planned).",
  },
];

export function getActivePaymentProvider(): PaymentProviderDescriptor {
  return (
    PAYMENT_PROVIDERS.find((provider) => provider.available) ??
    PAYMENT_PROVIDERS[0]
  );
}

export function getPaymentProvider(
  id: PaymentProviderId
): PaymentProviderDescriptor | undefined {
  return PAYMENT_PROVIDERS.find((provider) => provider.id === id);
}
