import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  computeVideoCreditQuote,
  type VideoCreditQuote,
} from "./mediaVideoCreditPricing";
import { listEnabledVideoModelTiers, VIDEO_MODEL_TIER_IDS } from "./mediaVideoProviderPricing";
import {
  DEFAULT_TARGET_MARGIN_BPS,
  MAX_TARGET_MARGIN_BPS,
  MIN_TARGET_MARGIN_BPS,
} from "./mediaVideoPricingConfig";

const tierValidator = v.union(
  v.literal("economy"),
  v.literal("standard"),
  v.literal("premium")
);

/** Public catalog + pricing parameters for Media Studio video models. */
export const getVideoModelCatalog = query({
  args: {},
  handler: async () => {
    return {
      tiers: listEnabledVideoModelTiers().map((tier) => ({
        id: tier.tier,
        label: tier.label,
        qualityLabel: tier.qualityLabel,
        description: tier.description,
        provider: tier.provider,
      })),
      margins: {
        minimumBps: MIN_TARGET_MARGIN_BPS,
        maximumBps: MAX_TARGET_MARGIN_BPS,
        defaultBps: DEFAULT_TARGET_MARGIN_BPS,
      },
      tierIds: [...VIDEO_MODEL_TIER_IDS],
    };
  },
});

/** Server-authoritative credit estimate for pre-production / long-video UI. */
export const estimateVideoProductionCredits = query({
  args: {
    targetDurationSec: v.number(),
    clipDurationSec: v.optional(v.number()),
    videoModelTier: v.optional(tierValidator),
    resolution: v.optional(v.string()),
    generateAudio: v.optional(v.boolean()),
    hasImage: v.optional(v.boolean()),
    sceneCount: v.optional(v.number()),
    includeScriptCredits: v.optional(v.boolean()),
  },
  handler: async (_ctx, args): Promise<VideoCreditQuote> => {
    return computeVideoCreditQuote({
      targetDurationSec: args.targetDurationSec,
      clipDurationSec: args.clipDurationSec,
      videoModelTier: args.videoModelTier,
      resolution: args.resolution,
      generateAudio: args.generateAudio,
      hasImage: args.hasImage,
      sceneCount: args.sceneCount,
      includeScriptCredits: args.includeScriptCredits,
    });
  },
});
