/**
 * Central provider/model cost configuration for Media Studio video pricing.
 * Update micro-USD values here when fal.ai pricing changes — never scrape at runtime.
 */

import {
  DEFAULT_FAL_IMAGE_VIDEO_MODEL,
  DEFAULT_FAL_TEXT_VIDEO_MODEL,
  falModelMaxDurationSec,
  resolveFalVideoModel,
} from "./falVideoModels";

export const VIDEO_MODEL_TIER_IDS = ["economy", "standard", "premium"] as const;
export type VideoModelTierId = (typeof VIDEO_MODEL_TIER_IDS)[number];

export type VideoQualityTier = "economy" | "standard" | "premium";

export type VideoProviderPricingEntry = {
  tier: VideoModelTierId;
  label: string;
  qualityLabel: VideoQualityTier;
  provider: "fal";
  textModelId: string;
  imageModelId: string;
  /** Base cost per provider generation at 720p without native audio (micro-USD). */
  baseCostMicroUsd: number;
  /** Additional micro-USD when native model audio is enabled. */
  nativeAudioCostMicroUsd: number;
  /** Resolution multipliers in basis points (10_000 = 1×). */
  resolutionMultipliersBps: Record<"480p" | "720p" | "1080p", number>;
  enabled: boolean;
  description: string;
};

/** Premium/standard fal model IDs — set via Convex env (no hardcoded provider paths). */
export function resolvePremiumTextModel(env: Record<string, string | undefined> = process.env): string {
  return env.FAL_VEO_TEXT_VIDEO_MODEL?.trim() || resolveFalVideoModel(false, env);
}

export function resolvePremiumImageModel(env: Record<string, string | undefined> = process.env): string {
  return (
    env.FAL_VEO_IMAGE_VIDEO_MODEL?.trim() ||
    env.FAL_IMAGE_VIDEO_MODEL?.trim() ||
    resolveFalVideoModel(true, env)
  );
}

export function resolveStandardTextModel(env: Record<string, string | undefined> = process.env): string {
  return env.FAL_KLING_TEXT_VIDEO_MODEL?.trim() || resolveFalVideoModel(false, env);
}

export function resolveStandardImageModel(env: Record<string, string | undefined> = process.env): string {
  return (
    env.FAL_KLING_IMAGE_VIDEO_MODEL?.trim() ||
    env.FAL_IMAGE_VIDEO_MODEL?.trim() ||
    resolveFalVideoModel(true, env)
  );
}

export const VIDEO_PROVIDER_PRICING: Record<VideoModelTierId, VideoProviderPricingEntry> = {
  economy: {
    tier: "economy",
    label: "Economy (Seedance)",
    qualityLabel: "economy",
    provider: "fal",
    textModelId: DEFAULT_FAL_TEXT_VIDEO_MODEL,
    imageModelId: DEFAULT_FAL_IMAGE_VIDEO_MODEL,
    baseCostMicroUsd: 220_000,
    nativeAudioCostMicroUsd: 45_000,
    resolutionMultipliersBps: { "480p": 9000, "720p": 10_000, "1080p": 12_500 },
    enabled: true,
    description: "Fast, economical clips — current Giga3 default economy.",
  },
  standard: {
    tier: "standard",
    label: "Standard (Kling)",
    qualityLabel: "standard",
    provider: "fal",
    textModelId: "fal-kling-text",
    imageModelId: "fal-kling-image",
    baseCostMicroUsd: 380_000,
    nativeAudioCostMicroUsd: 0,
    resolutionMultipliersBps: { "480p": 10_000, "720p": 10_000, "1080p": 13_000 },
    enabled: true,
    description: "Higher motion quality without premium Veo pricing.",
  },
  premium: {
    tier: "premium",
    label: "Premium (Veo 3.1)",
    qualityLabel: "premium",
    provider: "fal",
    textModelId: "fal-veo-text",
    imageModelId: "fal-veo-image",
    baseCostMicroUsd: 1_250_000,
    nativeAudioCostMicroUsd: 350_000,
    resolutionMultipliersBps: { "480p": 10_000, "720p": 10_000, "1080p": 14_000 },
    enabled: true,
    description: "Highest quality with native synced audio — priced for margin safety.",
  },
};

export function getVideoModelTierConfig(tier: VideoModelTierId): VideoProviderPricingEntry {
  return VIDEO_PROVIDER_PRICING[tier] ?? VIDEO_PROVIDER_PRICING.economy;
}

export function listEnabledVideoModelTiers(): VideoProviderPricingEntry[] {
  return VIDEO_MODEL_TIER_IDS.map((id) => VIDEO_PROVIDER_PRICING[id]).filter((t) => t.enabled);
}

export function resolveModelIdForTier(
  tier: VideoModelTierId,
  hasImage: boolean,
  env: Record<string, string | undefined> = process.env
): string {
  if (tier === "economy") {
    return resolveFalVideoModel(hasImage, env);
  }
  if (tier === "standard") {
    return hasImage ? resolveStandardImageModel(env) : resolveStandardTextModel(env);
  }
  return hasImage ? resolvePremiumImageModel(env) : resolvePremiumTextModel(env);
}

/** Pricing-only max duration when env model is not yet resolved (e.g. premium Veo ≈ 8s). */
const TIER_PRICING_MAX_DURATION_SEC: Record<VideoModelTierId, number> = {
  economy: 12,
  standard: 10,
  premium: 8,
};

export function providerMaxDurationForTier(
  tier: VideoModelTierId,
  hasImage: boolean,
  env: Record<string, string | undefined> = process.env
): number {
  const modelId = resolveModelIdForTier(tier, hasImage, env);
  const fromModel = falModelMaxDurationSec(modelId);
  const tierDefault = TIER_PRICING_MAX_DURATION_SEC[tier];
  return tier === "economy" ? fromModel : Math.min(fromModel, tierDefault);
}

export function resolutionMultiplierBps(
  entry: VideoProviderPricingEntry,
  resolution: string | undefined
): number {
  const key = resolution === "480p" || resolution === "1080p" ? resolution : "720p";
  return entry.resolutionMultipliersBps[key] ?? 10_000;
}

/** Provider generations required to cover a Giga3 logical clip duration. */
export function providerGenerationsRequired(
  gigaClipDurationSec: number,
  providerMaxDurationSec: number
): number {
  const clip = Math.max(1, Math.round(gigaClipDurationSec));
  const max = Math.max(1, Math.round(providerMaxDurationSec));
  return Math.max(1, Math.ceil(clip / max));
}

export function microUsdCostPerProviderGeneration(args: {
  tier: VideoModelTierId;
  resolution?: string;
  generateAudio: boolean;
  usesNativeAudio: boolean;
}): number {
  const entry = getVideoModelTierConfig(args.tier);
  const mult = resolutionMultiplierBps(entry, args.resolution);
  let cost = Math.round((entry.baseCostMicroUsd * mult) / 10_000);
  if (args.generateAudio && args.usesNativeAudio) {
    cost += entry.nativeAudioCostMicroUsd;
  }
  return cost;
}
