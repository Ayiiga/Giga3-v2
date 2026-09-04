import type { SubscriptionPlanId } from "@/lib/payments/types";
import { CREDIT_COSTS, FREE_STARTER_CREDITS } from "@/lib/payments/subscriptionCatalog";
import type { MediaVideoDurationSec } from "@/lib/media/videoLimits";

export { CREDIT_COSTS, FREE_STARTER_CREDITS };

export const CREDITS_PER_IMAGE = CREDIT_COSTS.image;
/** Minimum video tier (5s). Use `mediaVideoCreditCost(duration)` for the selected length. */
export const CREDITS_PER_VIDEO = CREDIT_COSTS.video;

export type VideoCreditTier = { durationSec: MediaVideoDurationSec; credits: number };

export interface UsageSnapshot {
  subscriptionPlan: SubscriptionPlanId;
  subscriptionActive: boolean;
  credits: number;
  tokens: number;
  subscriptionExpiresAt: number | null;
  planLabel: string;
  canGenerateVideo: boolean;
  creditCosts: typeof CREDIT_COSTS;
  videoCreditTiers?: VideoCreditTier[];
}
