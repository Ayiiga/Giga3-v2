import {
  isFreeImageGenerationEnabled,
  openAiImageRequiresSubscription,
} from "./featureFlags";
import { isSubscriptionActive } from "./creditsConfig";
import type { SubscriptionPlanId } from "./subscriptionPlans";

export const IMAGE_UPGRADE_MARKDOWN = [
  "**Premium image generation**",
  "",
  "High-quality **OpenAI image creation** is included with a Giga3 subscription (Basic, Pro, or Premium).",
  "",
  "Upgrade to unlock AI-generated images, or explore chat and research on the free plan.",
  "",
  "[View subscription plans](/subscribe/)",
].join("\n");

export type ImageGenerationDecision =
  | { action: "upgrade" }
  | { action: "openai" }
  | { action: "free_pipeline" };

export function hasActivePaidSubscription(
  plan: string,
  subscriptionExpiresAt?: number | null
): boolean {
  return isSubscriptionActive(plan as SubscriptionPlanId, subscriptionExpiresAt);
}

export function shouldOfferOpenAiImageGeneration(
  plan: string,
  subscriptionExpiresAt?: number | null
): boolean {
  if (!openAiImageRequiresSubscription()) return true;
  return hasActivePaidSubscription(plan, subscriptionExpiresAt);
}

export function shouldBlockFreeTierImageGeneration(
  plan: string,
  subscriptionExpiresAt?: number | null
): boolean {
  if (isFreeImageGenerationEnabled()) return false;
  return !hasActivePaidSubscription(plan, subscriptionExpiresAt);
}

export function resolveImageGenerationDecision(
  plan: string,
  subscriptionExpiresAt?: number | null
): ImageGenerationDecision {
  if (shouldBlockFreeTierImageGeneration(plan, subscriptionExpiresAt)) {
    return { action: "upgrade" };
  }
  if (shouldOfferOpenAiImageGeneration(plan, subscriptionExpiresAt)) {
    return { action: "openai" };
  }
  return { action: "free_pipeline" };
}
