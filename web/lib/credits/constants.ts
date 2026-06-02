import type { SubscriptionPlanId } from "@/lib/payments/types";
import { CREDIT_COSTS, FREE_STARTER_CREDITS } from "@/lib/payments/subscriptionCatalog";

export { CREDIT_COSTS, FREE_STARTER_CREDITS };

export interface UsageSnapshot {
  subscriptionPlan: SubscriptionPlanId;
  subscriptionActive: boolean;
  credits: number;
  tokens: number;
  subscriptionExpiresAt: number | null;
  planLabel: string;
  canGenerateVideo: boolean;
  creditCosts: typeof CREDIT_COSTS;
}
