/**
 * Model-aware Media Studio video credit pricing — server-authoritative.
 * Pure functions (no Convex runtime) so tests can import directly.
 */

import { mediaVideoCreditCost } from "./mediaVideoCredits";
import { MEDIA_VIDEO_MAX_DURATION_SEC } from "./mediaVideoLimits";
import { falModelMaxDurationSec, falModelSupportsAudio, resolveFalVideoModel } from "./falVideoModels";
import { CREDIT_COSTS } from "./creditsConfig";
import {
  applyOperationalBuffer,
  clampMarginBps,
  conservativeCreditValuePesewas,
  creditsFromRevenuePesewas,
  DEFAULT_TARGET_MARGIN_BPS,
  grossMarginBps,
  microUsdToPesewas,
  revenueForMarginPesewas,
} from "./mediaVideoPricingConfig";
import {
  getVideoModelTierConfig,
  microUsdCostPerProviderGeneration,
  providerGenerationsRequired,
  resolvePricingTierForVideo,
  type VideoModelTierId,
} from "./mediaVideoProviderPricing";

export type VideoCreditQuoteInput = {
  /** Total desired output length for long-video workflows. */
  targetDurationSec: number;
  /** Per-clip duration for single-clip or scene generation (5/10/15). */
  clipDurationSec?: number;
  videoModelTier?: VideoModelTierId;
  resolution?: string;
  generateAudio?: boolean;
  hasImage?: boolean;
  /** Scene count override (e.g. retry one scene). */
  sceneCount?: number;
  /** Include script-generation writing credits in total. */
  includeScriptCredits?: boolean;
  targetMarginBps?: number;
};

export type VideoCreditQuoteLine = {
  kind: "clip" | "script" | "voiceover";
  label: string;
  quantity: number;
  creditsEach: number;
  creditsTotal: number;
};

export type VideoCreditQuote = {
  videoModelTier: VideoModelTierId;
  modelLabel: string;
  qualityLabel: string;
  targetDurationSec: number;
  sceneCount: number;
  clipDurationSec: number;
  providerJobsPerScene: number;
  totalProviderJobs: number;
  generateAudio: boolean;
  usesNativeAudio: boolean;
  resolution: string;
  legacyEconomicalCredits: number;
  calculatedCredits: number;
  totalCredits: number;
  scriptCredits: number;
  marginBps: number;
  marginMeetsMinimum: boolean;
  providerCostMicroUsd: number;
  providerCostPesewas: number;
  creditValuePesewas: number;
  lines: VideoCreditQuoteLine[];
  usesLegacyEconomyPricing: boolean;
};

export function sceneCountForTarget(targetDurationSec: number): number {
  const safe = Math.max(MEDIA_VIDEO_MAX_DURATION_SEC, Math.round(targetDurationSec));
  return Math.max(1, Math.ceil(safe / MEDIA_VIDEO_MAX_DURATION_SEC));
}

function snapClipDuration(value: number | undefined): number {
  const d = Math.round(value ?? MEDIA_VIDEO_MAX_DURATION_SEC);
  if (d <= 5) return 5;
  if (d <= 10) return 10;
  return MEDIA_VIDEO_MAX_DURATION_SEC;
}

export function legacyEconomicalCredits(args: {
  targetDurationSec: number;
  clipDurationSec: number;
  sceneCount?: number;
}): number {
  const scenes = args.sceneCount ?? sceneCountForTarget(args.targetDurationSec);
  const perClip = mediaVideoCreditCost(args.clipDurationSec);
  return scenes * perClip;
}

export function computeProviderCostMicroUsd(args: {
  tier: VideoModelTierId;
  clipDurationSec: number;
  sceneCount: number;
  resolution?: string;
  generateAudio: boolean;
  hasImage: boolean;
}): { totalMicroUsd: number; jobsPerScene: number; totalJobs: number; usesNativeAudio: boolean } {
  const modelId = resolveFalVideoModel(args.hasImage);
  const usesNativeAudio = falModelSupportsAudio(modelId);
  const providerMax = falModelMaxDurationSec(modelId);
  const jobsPerScene = providerGenerationsRequired(args.clipDurationSec, providerMax);
  const perJob = microUsdCostPerProviderGeneration({
    tier: args.tier,
    resolution: args.resolution,
    generateAudio: args.generateAudio,
    usesNativeAudio,
  });
  const totalJobs = args.sceneCount * jobsPerScene;
  return {
    totalMicroUsd: perJob * totalJobs,
    jobsPerScene,
    totalJobs,
    usesNativeAudio,
  };
}

export function computeVideoCreditQuote(input: VideoCreditQuoteInput): VideoCreditQuote {
  const hasImage = Boolean(input.hasImage);
  const tier = resolvePricingTierForVideo(hasImage, input.videoModelTier);
  const config = getVideoModelTierConfig(tier);
  const targetDurationSec = Math.max(MEDIA_VIDEO_MAX_DURATION_SEC, Math.round(input.targetDurationSec));
  const clipDurationSec = snapClipDuration(input.clipDurationSec);
  const sceneCount = input.sceneCount ?? sceneCountForTarget(targetDurationSec);
  const generateAudio = input.generateAudio !== false;
  const resolution = input.resolution === "480p" || input.resolution === "1080p" ? input.resolution : "720p";
  const targetMarginBps = clampMarginBps(input.targetMarginBps);

  const legacy = legacyEconomicalCredits({
    targetDurationSec,
    clipDurationSec,
    sceneCount,
  });

  const provider = computeProviderCostMicroUsd({
    tier,
    clipDurationSec,
    sceneCount,
    resolution,
    generateAudio,
    hasImage,
  });

  const providerCostPesewas = microUsdToPesewas(provider.totalMicroUsd);
  const bufferedCostPesewas = applyOperationalBuffer(providerCostPesewas);
  const requiredRevenuePesewas = revenueForMarginPesewas(bufferedCostPesewas, targetMarginBps);
  let calculatedCredits = creditsFromRevenuePesewas(requiredRevenuePesewas);

  const usesLegacyEconomyPricing =
    tier === "economy" && calculatedCredits <= legacy;

  let totalCredits = usesLegacyEconomyPricing ? legacy : Math.max(calculatedCredits, legacy);

  // Margin guard — never accept below minimum margin.
  const revenuePesewas = totalCredits * conservativeCreditValuePesewas();
  let marginBps = grossMarginBps(revenuePesewas, providerCostPesewas);
  if (marginBps < targetMarginBps) {
    totalCredits = creditsFromRevenuePesewas(requiredRevenuePesewas);
    marginBps = grossMarginBps(totalCredits * conservativeCreditValuePesewas(), providerCostPesewas);
  }

  const scriptCredits = input.includeScriptCredits ? CREDIT_COSTS.writing : 0;
  const perSceneCredits = Math.max(1, Math.round(totalCredits / sceneCount));
  const lines: VideoCreditQuoteLine[] = [
    {
      kind: "clip",
      label: `${config.label} clip`,
      quantity: sceneCount,
      creditsEach: perSceneCredits,
      creditsTotal: totalCredits,
    },
  ];
  if (scriptCredits > 0) {
    lines.push({
      kind: "script",
      label: "Script generation",
      quantity: 1,
      creditsEach: scriptCredits,
      creditsTotal: scriptCredits,
    });
  }

  return {
    videoModelTier: tier,
    modelLabel: config.label,
    qualityLabel: config.qualityLabel,
    targetDurationSec,
    sceneCount,
    clipDurationSec,
    providerJobsPerScene: provider.jobsPerScene,
    totalProviderJobs: provider.totalJobs,
    generateAudio,
    usesNativeAudio: provider.usesNativeAudio,
    resolution,
    legacyEconomicalCredits: legacy,
    calculatedCredits,
    totalCredits: totalCredits + scriptCredits,
    scriptCredits,
    marginBps,
    marginMeetsMinimum: marginBps >= targetMarginBps,
    providerCostMicroUsd: provider.totalMicroUsd,
    providerCostPesewas,
    creditValuePesewas: conservativeCreditValuePesewas(),
    lines,
    usesLegacyEconomyPricing,
  };
}

/** Single-clip Media Studio charge (server-side). */
export function computeSingleClipVideoCredits(args: {
  durationSec: number;
  videoModelTier?: VideoModelTierId;
  resolution?: string;
  generateAudio?: boolean;
  hasImage?: boolean;
  targetMarginBps?: number;
}): number {
  const quote = computeVideoCreditQuote({
    targetDurationSec: args.durationSec,
    clipDurationSec: args.durationSec,
    sceneCount: 1,
    videoModelTier: args.videoModelTier,
    resolution: args.resolution,
    generateAudio: args.generateAudio,
    hasImage: args.hasImage,
    targetMarginBps: args.targetMarginBps,
  });
  return quote.totalCredits;
}

export { DEFAULT_TARGET_MARGIN_BPS };
