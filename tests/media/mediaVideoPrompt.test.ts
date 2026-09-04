import { describe, expect, it } from "vitest";
import {
  defaultVideoNegativePrompt,
  refineVideoPromptForGeneration,
  videoPromptNeedsTextGuard,
} from "../../convex/mediaVideoPrompt";

describe("mediaVideoPrompt", () => {
  it("detects prompts that risk garbled on-screen text", () => {
    expect(videoPromptNeedsTextGuard("Giga3 app promo with logo on screen")).toBe(true);
    expect(videoPromptNeedsTextGuard("Two friends walking on a beach at sunset")).toBe(false);
    expect(videoPromptNeedsTextGuard('Presenter says "Welcome to Giga3"')).toBe(true);
  });

  it("steers text-heavy prompts away from readable UI without a source image", () => {
    const refined = refineVideoPromptForGeneration("Giga3 mobile app demo on a phone", false);
    expect(refined).toContain("Do not generate readable text");
    expect(refined).toContain("blurred screens");
  });

  it("preserves source-image prompts with stability guidance", () => {
    const refined = refineVideoPromptForGeneration("Animate the Giga3 logo", true);
    expect(refined).toContain("preserving the source image");
    expect(refined).toContain("do not warp letters");
  });

  it("adds a default negative prompt for text-risk prompts", () => {
    const negative = defaultVideoNegativePrompt("Brand logo video");
    expect(negative).toContain("garbled text");
    expect(negative).toContain("illegible letters");
  });
});
