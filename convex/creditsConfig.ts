import type { SubscriptionPlanId } from "./subscriptionPlans";

/**
 * Credits charged per AI action.
 *
 * Ordinary conversational chat (text Q&A, follow-ups, explanations, writing help
 * inside the chat thread) is **not** credit-priced. `chat` / `writing` / `research`
 * remain for legacy mode mapping and for non-chat surfaces that still call
 * `deductForChatMode*` (e.g. free-pipeline image failover, GigaLearn tools).
 * Image/video remain explicitly credit-priced premium operations.
 */
export const CREDIT_COSTS = {
  chat: 1,
  writing: 2,
  research: 3,
  image: 2,
  video: 9,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** Map chat mode → credit action category */
export function creditActionForMode(mode: string): CreditAction {
  const writingModes = new Set(["homework", "resume", "book", "social", "gigalearn"]);
  const researchModes = new Set(["research", "university", "waec", "news"]);
  if (writingModes.has(mode)) return "writing";
  if (researchModes.has(mode)) return "research";
  return "chat";
}

/**
 * Whether a chat-engine request kind should consume credits.
 * Normal text chat is free; image generation remains a paid premium op.
 */
export function shouldDeductCreditsForChatRequestKind(
  requestKind: "text_chat" | "image_generation" | string
): boolean {
  return requestKind === "image_generation";
}

/** Credit action required before enqueueing an in-chat image generation. */
export function creditActionForChatImageGeneration(): CreditAction {
  return "image";
}

export function isSubscriptionActive(
  plan: SubscriptionPlanId,
  subscriptionExpiresAt?: number | null
): boolean {
  if (plan === "free") return false;
  if (!subscriptionExpiresAt) return false;
  return subscriptionExpiresAt > Date.now();
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
