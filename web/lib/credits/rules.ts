import {
  CREDITS_PER_IMAGE,
  CREDITS_PER_VIDEO,
  FREE_DAILY_CHATS,
  FREE_DAILY_IMAGES,
  type UsageSnapshot,
  type UserTier,
} from "./constants";

export function isPremiumUser(
  tier: UserTier,
  subscriptionExpiresAt?: number | null
): boolean {
  if (tier !== "premium") return false;
  if (!subscriptionExpiresAt) return true;
  return subscriptionExpiresAt > Date.now();
}

export function chatsRemaining(snapshot: UsageSnapshot): number | null {
  if (snapshot.premium) return null;
  if (snapshot.chatsLimit === null) return null;
  return Math.max(0, snapshot.chatsLimit - snapshot.chatsUsed);
}

export function imagesRemaining(snapshot: UsageSnapshot): number | null {
  if (snapshot.premium) return null;
  if (snapshot.imagesLimit === null) return null;
  return Math.max(0, snapshot.imagesLimit - snapshot.imagesUsed);
}

export function canSendChat(snapshot: UsageSnapshot): boolean {
  if (snapshot.premium) return true;
  return (snapshot.chatsUsed ?? 0) < FREE_DAILY_CHATS;
}

export function canGenerateImage(snapshot: UsageSnapshot): boolean {
  if (!snapshot.premium) {
    return (snapshot.imagesUsed ?? 0) < FREE_DAILY_IMAGES;
  }
  return snapshot.credits >= CREDITS_PER_IMAGE;
}

export function canGenerateVideo(snapshot: UsageSnapshot): boolean {
  if (!snapshot.premium) return false;
  return snapshot.credits >= CREDITS_PER_VIDEO;
}

export function formatLimit(used: number, limit: number | null): string {
  if (limit === null) return `${used} (unlimited)`;
  return `${used} / ${limit}`;
}
