import type { SubscriptionPlanId } from "@/lib/payments/types";

/** GigaWallet display names — maps Convex plan ids to product tiers. */
export const WALLET_PLAN_LABELS: Record<SubscriptionPlanId, string> = {
  free: "Free",
  basic: "Student",
  pro: "Creator Pro",
  premium: "Business",
};

export const FUTURE_PLAN_LABEL = "Enterprise";

export type PlanEntitlement = {
  label: string;
  included: boolean;
};

export function walletPlanLabel(planId: string): string {
  return WALLET_PLAN_LABELS[planId as SubscriptionPlanId] ?? planId;
}

export function planEntitlements(planId: SubscriptionPlanId): PlanEntitlement[] {
  const isFree = planId === "free";
  const isStudent = planId === "basic" || planId === "pro" || planId === "premium";
  const isCreator = planId === "pro" || planId === "premium";
  const isBusiness = planId === "premium";

  return [
    { label: "AI chat & writing modes", included: true },
    { label: "Creator Studio access", included: isStudent },
    { label: "GigaSocial communities", included: true },
    { label: "Marketplace listing privileges", included: isCreator },
    { label: "Premium media tools", included: isCreator },
    { label: "Team storage & admin tools", included: isBusiness },
    { label: `${FUTURE_PLAN_LABEL} (coming soon)`, included: false },
  ];
}
