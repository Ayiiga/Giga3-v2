/**
 * Server-side feature flags (env-driven, default-safe for backward compatibility).
 */

export function isLiveNewsEnabled(): boolean {
  return process.env.GIGA3_LIVE_NEWS_ENABLED !== "false";
}

export function isPushAlertsEnabled(): boolean {
  return process.env.GIGA3_PUSH_ALERTS_ENABLED === "true";
}

/** When false, free-tier users see an upgrade prompt instead of image generation. Default: true (legacy). */
export function isFreeImageGenerationEnabled(): boolean {
  return process.env.GIGA3_FREE_IMAGE_GENERATION_ENABLED !== "false";
}

/** When true (default), OpenAI images require an active paid subscription. */
export function openAiImageRequiresSubscription(): boolean {
  return process.env.GIGA3_OPENAI_IMAGE_REQUIRES_SUBSCRIPTION !== "false";
}

export function getVapidPublicKey(): string | undefined {
  return process.env.VAPID_PUBLIC_KEY?.trim() || undefined;
}

/** Remote config defaults — overridable via remoteConfigEntries table. */
export function isOnboardingEnabled(): boolean {
  return process.env.GIGA3_ONBOARDING_ENABLED !== "false";
}

export function isReferralProgramEnabled(): boolean {
  return process.env.GIGA3_REFERRALS_ENABLED !== "false";
}

export function isGlobalSearchEnabled(): boolean {
  return process.env.GIGA3_GLOBAL_SEARCH_ENABLED !== "false";
}
