/**
 * Marketing-facing pricing teasers derived from subscriptionCatalog.ts.
 * Charge amounts remain authoritative in convex/subscriptionPlans.ts.
 */
import { formatGhs } from "./plans";
import { FREE_STARTER_CREDITS, SUBSCRIPTION_PLANS } from "./subscriptionCatalog";

export type MarketingPlanTeaser = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: readonly string[];
  cta: string;
  href: string;
  highlighted: boolean;
};

/** Canonical subscription plan label for public UI (Basic / Pro / Premium). */
export function subscriptionPlanLabel(planId: keyof typeof SUBSCRIPTION_PLANS): string {
  return SUBSCRIPTION_PLANS[planId].label;
}

/** One-line upsell for the default paid plan (Pro). */
export function defaultPaidPlanUpsell(): string {
  const pro = SUBSCRIPTION_PLANS.pro;
  return `${pro.label} — ${formatGhs(pro.priceGhs)}/month (${pro.credits} credits)`;
}

/** Homepage + marketing section teasers — mirrors full catalog at /pricing. */
export function buildHomepagePricingTeasers(): readonly MarketingPlanTeaser[] {
  const { basic, pro, premium } = SUBSCRIPTION_PLANS;

  return [
    {
      name: "Free",
      price: formatGhs(0),
      period: "",
      description: `${FREE_STARTER_CREDITS} starter credits to explore chat, writing, and media.`,
      features: [
        `${FREE_STARTER_CREDITS} starter credits`,
        "Chat & research modes",
        "Image & video studio",
        "Email sign-in",
      ],
      cta: "Get started",
      href: "/chat/login",
      highlighted: false,
    },
    {
      name: basic.label,
      price: formatGhs(basic.priceGhs),
      period: "/ month",
      description: basic.description,
      features: [
        `${basic.credits} credits / month`,
        "Paystack billing",
        "Media studio",
        "PWA install",
      ],
      cta: "View plans",
      href: "/pricing",
      highlighted: false,
    },
    {
      name: pro.label,
      price: formatGhs(pro.priceGhs),
      period: "/ month",
      description: pro.description,
      features: [
        `${pro.credits} credits / month`,
        "Paystack billing",
        "Media studio",
        "PWA install",
      ],
      cta: "View plans",
      href: "/pricing",
      highlighted: true,
    },
    {
      name: premium.label,
      price: formatGhs(premium.priceGhs),
      period: "/ month",
      description: premium.description,
      features: [
        `${premium.credits} credits / month`,
        "Paystack billing",
        "Media studio",
        "Team-friendly limits",
      ],
      cta: "View plans",
      href: "/pricing",
      highlighted: false,
    },
  ] as const;
}

/** Enterprise is quote-based — separate from subscription tiers. */
export const ENTERPRISE_PRICING_TEASER = {
  name: "Enterprise",
  price: "Custom",
  period: "",
  description: "Volume pricing and dedicated support for organizations.",
  features: [
    "Custom credit pools",
    "SLA options",
    "Dedicated onboarding",
    "Invoice billing",
  ],
  cta: "Contact sales",
  href: "/enterprise",
  highlighted: false,
} as const satisfies MarketingPlanTeaser;
