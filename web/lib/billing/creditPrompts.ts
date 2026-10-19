import { CREDIT_COSTS } from "@/lib/credits/constants";
import { defaultPaidPlanUpsell } from "@/lib/payments/marketingPricing";

export const CHAT_CREDIT_COST = CREDIT_COSTS.chat;
export const LOW_CREDIT_THRESHOLD = 5;

export type CreditPromptVariant = "empty" | "low" | "error" | "subscribe";

export function isInsufficientCreditsMessage(message: string): boolean {
  return /insufficient credits/i.test(message);
}

export function isInsufficientTokensMessage(message: string): boolean {
  return /insufficient tokens/i.test(message);
}

export function isBillingRelatedError(message: string): boolean {
  return (
    isInsufficientCreditsMessage(message) ||
    isInsufficientTokensMessage(message) ||
    /subscribe or renew/i.test(message) ||
    /buy a video ai pack/i.test(message)
  );
}

/**
 * Proactive balance warning for premium ops (image/video) — null when not needed.
 * Ordinary text chat is credit-free, so a zero balance must not block chat or
 * imply a per-message chat charge.
 */
export function creditBalancePrompt(
  credits: number | null,
  minCost = CREDIT_COSTS.image
): Exclude<CreditPromptVariant, "error" | "subscribe"> | null {
  if (credits === null) return null;
  // Soft upsell only — never treat chat as requiring credits.
  if (credits <= 0) return "low";
  if (credits < minCost) return "low";
  if (credits <= LOW_CREDIT_THRESHOLD) return "low";
  return null;
}

export function creditPromptMessage(args: {
  variant: CreditPromptVariant;
  credits?: number | null;
  creditCost?: number;
  errorMessage?: string;
}): string {
  const { variant, credits, creditCost = CHAT_CREDIT_COST, errorMessage } = args;

  if (variant === "error" && errorMessage) {
    return errorMessage;
  }

  const proUpsell = defaultPaidPlanUpsell();

  if (variant === "subscribe") {
    return `Unlock the Pro chat model with a subscription. We recommend **${proUpsell}** at /subscribe/, or buy a credit pack.`;
  }

  if (variant === "empty") {
    return `You're out of credits for premium generation (about ${creditCost} per image). Ordinary chat stays free — subscribe for monthly refills (**${proUpsell}** at /subscribe/) or buy a credit pack for images and video.`;
  }

  if (variant === "low" && credits != null) {
    return `You have ${credits} credit${credits === 1 ? "" : "s"} left for images and other premium tools. Ordinary chat stays free — subscribe (**${proUpsell}**) or top up when you need generation.`;
  }

  return `Subscribe (${proUpsell}) or buy credits to continue using Giga3 AI.`;
}
