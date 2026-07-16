import { CREDIT_COSTS } from "@/lib/credits/constants";

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

/** Proactive balance warning — null when no prompt is needed. */
export function creditBalancePrompt(
  credits: number | null,
  minCost = CHAT_CREDIT_COST
): Exclude<CreditPromptVariant, "error" | "subscribe"> | null {
  if (credits === null) return null;
  if (credits < minCost) return "empty";
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

  if (variant === "subscribe") {
    return "Giga3 Pro uses OpenAI GPT-4. Subscribe for monthly credits or buy a pack to unlock Pro.";
  }

  if (variant === "empty") {
    return `You're out of credits (${creditCost} per message). Subscribe for monthly refills or buy a credit pack to continue.`;
  }

  if (variant === "low" && credits != null) {
    return `You have ${credits} credit${credits === 1 ? "" : "s"} left. Subscribe or top up before you run out.`;
  }

  return "Subscribe or buy credits to continue using Giga3 AI.";
}
