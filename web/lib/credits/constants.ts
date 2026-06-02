export const FREE_DAILY_CHATS = 15;
export const FREE_DAILY_IMAGES = 5;
export const CREDITS_PER_IMAGE = 2;
export const CREDITS_PER_VIDEO = 8;

export type UserTier = "free" | "premium";

export interface UsageSnapshot {
  tier: UserTier;
  premium: boolean;
  credits: number;
  tokens: number;
  dateKey: string;
  chatsUsed: number;
  chatsLimit: number | null;
  imagesUsed: number;
  imagesLimit: number | null;
  canGenerateVideo: boolean;
}
