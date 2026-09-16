/**
 * Central provider/model cost configuration for Media Studio video pricing.
 * Update micro-USD values here when fal.ai pricing changes — never scrape at runtime.
 */

import {
  DEFAULT_FAL_IMAGE_VIDEO_MODEL,
  DEFAULT_FAL_TEXT_VIDEO_MODEL,
  detectFalModelFamily,
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

/** Map the configured fal.ai model family to a pricing tier (routing stays on fal env). */
export function pricingTierFromFalModel(modelId: string): VideoModelTierId {
  const family = detectFalModelFamily(modelId);
  if (family === "veo") return "premium";
  if (family === "kling") return "standard";
  return "economy";
}

/** Pricing tier for a request — uses explicit tier when set, else the configured fal model. */
export function resolvePricingTierForVideo(
  hasImage: boolean,
  videoModelTier?: VideoModelTierId,
  env: Record<string, string | undefined> = process.env
): VideoModelTierId {
  if (videoModelTier) return videoModelTier;
  return pricingTierFromFalModel(resolveFalVideoModel(hasImage, env));
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

export function providerMaxDurationForTier(
  tier: VideoModelTierId,
  hasImage: boolean,
  env: Record<string, string | undefined> = process.env
): number {
  const modelId = resolveFalVideoModel(hasImage, env);
  return falModelMaxDurationSec(modelId);
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
