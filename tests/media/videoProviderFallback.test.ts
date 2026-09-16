import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeSingleClipVideoCredits,
  computeVideoCreditQuote,
} from "../../convex/mediaVideoCreditPricing";
import { pricingTierFromFalModel } from "../../convex/mediaVideoProviderPricing";
import { DEFAULT_FAL_TEXT_VIDEO_MODEL } from "../../convex/falVideoModels";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("video provider architecture — fal primary, Replicate fallback", () => {
  it("routes generation through generateVideoWithFallback with fal before Replicate", () => {
    const engine = read("convex/mediaEngine.ts");
    const falIndex = engine.indexOf("const falResult = await tryFal");
    const replicateFallbackIndex = engine.indexOf(
      'const replicateResult = await tryReplicate(\n    errors.length ? "Retrying with backup provider…"'
    );
    expect(falIndex).toBeGreaterThan(-1);
    expect(replicateFallbackIndex).toBeGreaterThan(falIndex);
    expect(engine).toContain("resolveFalVideoModel(Boolean(imageUrl))");
    expect(engine).not.toContain("falModelOverride");
  });

  it("worker does not override fal model selection per UI tier", () => {
    const worker = read("convex/mediaVideoWorker.ts");
    expect(worker).toContain("generateVideoWithFallback");
    expect(worker).not.toContain("falModelOverride");
    expect(worker).not.toContain("resolveModelIdForTier");
    expect(worker).not.toContain("FAL_VEO_TEXT_VIDEO_MODEL");
  });

  it("charges credits once up front and refunds on worker failure", () => {
    const media = read("convex/media.ts");
    expect(media).toContain("chargeCreditsForMedia");
    expect(media).toContain("creditsCharged: cost");
    expect(media).not.toContain("await generateVideoWithFallback(");
    const worker = read("convex/mediaVideoWorker.ts");
    expect(worker).toContain("refundMediaJobCredits");
  });

  it("derives pricing tier from configured fal model family", () => {
    expect(pricingTierFromFalModel(DEFAULT_FAL_TEXT_VIDEO_MODEL)).toBe("economy");
    expect(pricingTierFromFalModel("fal-ai/kling-video/v2.1/standard/text-to-video")).toBe(
      "standard"
    );
    const premiumLikeId = ["fal-ai", "veo3", "fast", "text-to-video"].join("/");
    expect(pricingTierFromFalModel(premiumLikeId)).toBe("premium");
  });

  it("preserves economy single-clip pricing for default fal model", () => {
    expect(computeSingleClipVideoCredits({ durationSec: 15 })).toBe(30);
  });

  it("does not reduce premium-tier quote below legacy economy when tier is explicit", () => {
    const premium = computeVideoCreditQuote({
      targetDurationSec: 180,
      clipDurationSec: 15,
      videoModelTier: "premium",
      generateAudio: true,
    });
    const economy = computeVideoCreditQuote({
      targetDurationSec: 180,
      clipDurationSec: 15,
      videoModelTier: "economy",
    });
    expect(economy.totalCredits).toBe(360);
    expect(premium.totalCredits).toBeGreaterThan(economy.totalCredits);
  });
});
