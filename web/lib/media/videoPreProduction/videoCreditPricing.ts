/**
 * Web mirror of convex/mediaVideoCreditPricing — keep in sync for offline UI estimates.
 * Server-authoritative quotes come from api.mediaVideoPricing.estimateVideoProductionCredits.
 */

import { mediaVideoCreditCost } from "@/lib/media/videoCredits";
import { MEDIA_VIDEO_MAX_DURATION_SEC } from "@/lib/media/videoLimits";

export const VIDEO_MODEL_TIER_IDS = ["economy", "standard", "premium"] as const;
export type VideoModelTierId = (typeof VIDEO_MODEL_TIER_IDS)[number];

export type VideoModelTierOption = {
  id: VideoModelTierId;
  label: string;
  qualityLabel: "economy" | "standard" | "premium";
  description: string;
};

export const VIDEO_MODEL_TIER_OPTIONS: VideoModelTierOption[] = [
  {
    id: "economy",
    label: "Economy (Seedance)",
    qualityLabel: "economy",
    description: "Fast, economical clips — current Giga3 default.",
  },
  {
    id: "standard",
    label: "Standard (Kling)",
    qualityLabel: "standard",
    description: "Higher motion quality at moderate cost.",
  },
  {
    id: "premium",
    label: "Premium (Veo 3.1)",
    qualityLabel: "premium",
    description: "Highest quality with native synced audio.",
  },
];

export function sceneCountForTarget(targetDurationSec: number): number {
  const safe = Math.max(MEDIA_VIDEO_MAX_DURATION_SEC, Math.round(targetDurationSec));
  return Math.max(1, Math.ceil(safe / MEDIA_VIDEO_MAX_DURATION_SEC));
}

/** Legacy economical estimate — used until server quote loads. */
export function estimateLegacyVideoCredits(
  targetDurationSec: number,
  clipDurationSec: number
): number {
  const scenes = sceneCountForTarget(targetDurationSec);
  return scenes * mediaVideoCreditCost(clipDurationSec);
}

export function formatQualityLabel(tier: VideoModelTierId): string {
  const match = VIDEO_MODEL_TIER_OPTIONS.find((t) => t.id === tier);
  return match?.qualityLabel ?? "economy";
}
