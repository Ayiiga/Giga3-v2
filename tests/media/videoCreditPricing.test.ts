import { describe, expect, it } from "vitest";
import {
  computeSingleClipVideoCredits,
  computeVideoCreditQuote,
  legacyEconomicalCredits,
  sceneCountForTarget,
} from "../../convex/mediaVideoCreditPricing";
import {
  conservativeCreditValuePesewas,
  creditsFromRevenuePesewas,
  grossMarginBps,
  revenueForMarginPesewas,
} from "../../convex/mediaVideoPricingConfig";
import {
  providerGenerationsRequired,
  VIDEO_PROVIDER_PRICING,
} from "../../convex/mediaVideoProviderPricing";
import { mediaVideoCreditCost } from "../../web/lib/media/videoCredits";
import { estimateLegacyVideoCredits } from "../../web/lib/media/videoPreProduction/videoCreditPricing";

describe("video credit pricing — economical models", () => {
  it("charges 30 credits for a 15-second economy clip", () => {
    expect(computeSingleClipVideoCredits({ durationSec: 15, videoModelTier: "economy" })).toBe(30);
    expect(mediaVideoCreditCost(15)).toBe(30);
  });

  it("charges 360 credits for a 3-minute economy long video", () => {
    const quote = computeVideoCreditQuote({
      targetDurationSec: 180,
      clipDurationSec: 15,
      videoModelTier: "economy",
      generateAudio: true,
    });
    expect(quote.sceneCount).toBe(12);
    expect(quote.legacyEconomicalCredits).toBe(360);
    expect(quote.totalCredits).toBe(360);
    expect(quote.usesLegacyEconomyPricing).toBe(true);
  });

  it("matches legacy tier table for 30s, 1m, 1.5m, 2m economy targets", () => {
    const cases = [
      { sec: 30, credits: 60 },
      { sec: 60, credits: 120 },
      { sec: 90, credits: 180 },
      { sec: 120, credits: 240 },
    ];
    for (const { sec, credits } of cases) {
      expect(
        computeVideoCreditQuote({
          targetDurationSec: sec,
          clipDurationSec: 15,
          videoModelTier: "economy",
        }).totalCredits
      ).toBe(credits);
    }
  });

  it("web legacy mirror matches convex economy totals", () => {
    expect(estimateLegacyVideoCredits(180, 15)).toBe(360);
    expect(legacyEconomicalCredits({ targetDurationSec: 180, clipDurationSec: 15 })).toBe(360);
  });
});

describe("video credit pricing — premium models", () => {
  it("charges more than economy for premium 3-minute video", () => {
    const economy = computeVideoCreditQuote({
      targetDurationSec: 180,
      clipDurationSec: 15,
      videoModelTier: "economy",
    });
    const premium = computeVideoCreditQuote({
      targetDurationSec: 180,
      clipDurationSec: 15,
      videoModelTier: "premium",
      generateAudio: true,
      resolution: "720p",
    });
    expect(premium.totalCredits).toBeGreaterThan(economy.totalCredits);
    expect(premium.totalCredits).toBeGreaterThan(360);
    expect(premium.usesLegacyEconomyPricing).toBe(false);
  });

  it("adds native audio cost for premium Veo with audio on", () => {
    const withAudio = computeVideoCreditQuote({
      targetDurationSec: 15,
      clipDurationSec: 15,
      videoModelTier: "premium",
      generateAudio: true,
    });
    const withoutAudio = computeVideoCreditQuote({
      targetDurationSec: 15,
      clipDurationSec: 15,
      videoModelTier: "premium",
      generateAudio: false,
    });
    expect(withAudio.totalCredits).toBeGreaterThanOrEqual(withoutAudio.totalCredits);
    expect(withAudio.usesNativeAudio).toBe(true);
  });

  it("accounts for 8-second Veo provider generations on a 15-second scene", () => {
    const veoMax = 8;
    expect(providerGenerationsRequired(15, veoMax)).toBe(2);
    const quote = computeVideoCreditQuote({
      targetDurationSec: 15,
      clipDurationSec: 15,
      videoModelTier: "premium",
      sceneCount: 1,
      generateAudio: true,
    });
    expect(quote.providerJobsPerScene).toBe(2);
    expect(quote.totalProviderJobs).toBe(2);
  });
});

describe("video credit pricing — margin and rounding", () => {
  it("uses integer pesewas and basis points for margin math", () => {
    const cost = 10_000;
    const revenue = revenueForMarginPesewas(cost, 4000);
    expect(revenue).toBeGreaterThan(cost);
    expect(grossMarginBps(revenue, cost)).toBeGreaterThanOrEqual(4000);
  });

  it("meets minimum margin for premium quotes", () => {
    const quote = computeVideoCreditQuote({
      targetDurationSec: 180,
      videoModelTier: "premium",
      generateAudio: true,
    });
    expect(quote.marginMeetsMinimum).toBe(true);
    expect(quote.marginBps).toBeGreaterThanOrEqual(2000);
  });

  it("rounds credits up from revenue pesewas", () => {
    expect(creditsFromRevenuePesewas(conservativeCreditValuePesewas() + 1)).toBe(2);
  });

  it("uses different resolution multipliers", () => {
    const hd = computeVideoCreditQuote({
      targetDurationSec: 15,
      videoModelTier: "premium",
      resolution: "720p",
    });
    const fullHd = computeVideoCreditQuote({
      targetDurationSec: 15,
      videoModelTier: "premium",
      resolution: "1080p",
    });
    expect(fullHd.totalCredits).toBeGreaterThanOrEqual(hd.totalCredits);
  });
});

describe("video credit pricing — script and scene overrides", () => {
  it("can include script writing credits in total", () => {
    const quote = computeVideoCreditQuote({
      targetDurationSec: 30,
      videoModelTier: "economy",
      includeScriptCredits: true,
    });
    expect(quote.scriptCredits).toBe(2);
    expect(quote.totalCredits).toBe(62);
  });

  it("supports retrying a single failed scene via sceneCount override", () => {
    const full = computeVideoCreditQuote({
      targetDurationSec: 180,
      videoModelTier: "premium",
      sceneCount: 12,
    });
    const one = computeVideoCreditQuote({
      targetDurationSec: 180,
      videoModelTier: "premium",
      sceneCount: 1,
    });
    expect(one.totalCredits).toBeLessThan(full.totalCredits);
  });
});

describe("provider pricing configuration", () => {
  it("defines economy, standard, and premium tiers", () => {
    expect(VIDEO_PROVIDER_PRICING.economy.enabled).toBe(true);
    expect(VIDEO_PROVIDER_PRICING.premium.baseCostMicroUsd).toBeGreaterThan(
      VIDEO_PROVIDER_PRICING.economy.baseCostMicroUsd
    );
  });

  it("computes scene count for long targets", () => {
    expect(sceneCountForTarget(180)).toBe(12);
    expect(sceneCountForTarget(15)).toBe(1);
  });
});
