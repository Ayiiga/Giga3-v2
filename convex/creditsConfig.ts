/** Server-side credit & usage limits — mirror web/lib/credits/constants.ts */
export const FREE_DAILY_CHATS = 15;
export const FREE_DAILY_IMAGES = 5;
export const CREDITS_PER_IMAGE = 2;
export const CREDITS_PER_VIDEO = 8;

export type UserTier = "free" | "premium";

export function isPremium(
  tier: string,
  subscriptionExpiresAt?: number | null
): boolean {
  if (tier !== "premium") return false;
  if (!subscriptionExpiresAt) return true;
  return subscriptionExpiresAt > Date.now();
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
