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
    return "Unlock Giga3 Pro (OpenAI GPT-4) with a subscription. We recommend **Giga3 Pro — GHC 150/month** (250 credits) at /subscribe/, or buy a credit pack.";
  }

  if (variant === "empty") {
    return `You're out of credits (${creditCost} per message). Subscribe for monthly refills — **Giga3 Pro is GHC 150/month** (250 credits) at /subscribe/ — or buy a credit pack to continue.`;
  }

  if (variant === "low" && credits != null) {
    return `You have ${credits} credit${credits === 1 ? "" : "s"} left. Subscribe (**Giga3 Pro — GHC 150/month**) or top up before you run out.`;
  }

  return "Subscribe to Giga3 Pro (GHC 150/month) or buy credits to continue using Giga3 AI.";
}
