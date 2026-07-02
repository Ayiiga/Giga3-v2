/**
 * Shared chat network timings — used by both Convex-native and Supabase-hybrid
 * chat platforms. Supabase mode stores history in Supabase but still sends AI
 * jobs through Convex HTTP (chatMessaging:acceptMessage).
 */

export const CHAT_ACCEPT_TIMEOUT_MS = 45_000;
export const CHAT_ACCEPT_TIMEOUT_SLOW_MS = 90_000;
export const CHAT_ACCEPT_TIMEOUT_IMAGE_MS = 120_000;
export const CHAT_REPLY_WAIT_MS = 150_000;
export const CHAT_REPLY_WAIT_SLOW_MS = 180_000;
export const CHAT_REPLY_POLL_MS = 2_000;
export const CHAT_REPLY_POLL_SLOW_MS = 2_000;
export const CHAT_REPLY_POLL_NORMAL_MS = 5_000;
export const MAX_SEND_RETRIES = 3;
export const MAX_SEND_RETRIES_SLOW = 4;
export const RETRY_BASE_MS = 600;
export const RETRY_BASE_SLOW_MS = 1_200;
export const CHAT_REGENERATE_TIMEOUT_MS = 180_000;

export function acceptTimeoutMs(
  slowNetwork: boolean,
  hasImages = false
): number {
  if (hasImages) return CHAT_ACCEPT_TIMEOUT_IMAGE_MS;
  return slowNetwork ? CHAT_ACCEPT_TIMEOUT_SLOW_MS : CHAT_ACCEPT_TIMEOUT_MS;
}

export function replyWaitMs(slowNetwork: boolean): number {
  return slowNetwork ? CHAT_REPLY_WAIT_SLOW_MS : CHAT_REPLY_WAIT_MS;
}

export function maxSendRetries(slowNetwork: boolean): number {
  return slowNetwork ? MAX_SEND_RETRIES_SLOW : MAX_SEND_RETRIES;
}
