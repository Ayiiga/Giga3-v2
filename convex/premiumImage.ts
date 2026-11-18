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

/** Shown when a free user has already used today's successful AI image allowance. */
export function imageDailyLimitMarkdown(args: {
  limit: number;
  resetsAt: number;
  timeZone?: string;
}): string {
  const tz = args.timeZone || "Africa/Accra";
  const resetLabel = new Intl.DateTimeFormat("en-GH", {
    timeZone: tz,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(args.resetsAt));
  const n = Math.max(1, args.limit);
  return [
    "**Daily free image limit reached**",
    "",
    `Free accounts include **${n} successful AI image${n === 1 ? "" : "s"} per day** (resets ${resetLabel}, ${tz}).`,
    "",
    "Failed generations do not use your allowance. CV and letter templates stay free and do not use this image limit.",
    "",
    "Ordinary text chat is unchanged. Subscribe for higher-quality OpenAI images and more capacity.",
    "",
    "[View subscription plans](/subscribe/)",
  ].join("\n");
}

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

/** Image access uses the existing credit balance, including starter credits. */
export function shouldOfferOpenAiImageGeneration(
  _plan: string,
  _subscriptionExpiresAt?: number | null
): boolean {
  return true;
}

export function shouldBlockFreeTierImageGeneration(
  _plan: string,
  _subscriptionExpiresAt?: number | null
): boolean {
  return false;
}

export function resolveImageGenerationDecision(
  _plan: string,
  _subscriptionExpiresAt?: number | null
): ImageGenerationDecision {
  return { action: "openai" };
}
