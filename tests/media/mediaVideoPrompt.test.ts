import { describe, expect, it } from "vitest";
import {
  buildVideoPromptWithOptionalImage,
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

  it("combines user image and prompt for image-to-video", () => {
    const combined = buildVideoPromptWithOptionalImage(
      "Cinematic office walkthrough with soft lighting",
      "office walkthrough",
      "user"
    );
    expect(combined).toContain("office walkthrough");
    expect(combined).toContain("provided source image");
    expect(combined).toContain("follow the prompt");
  });

  it("keeps text-only prompts when no image is provided", () => {
    const textOnly = buildVideoPromptWithOptionalImage(
      "Two friends walking on a beach at sunset",
      "beach sunset",
      "none"
    );
    expect(textOnly).toBe("Two friends walking on a beach at sunset");
  });

  it("uses built prompt and generated frame for auto image-first pipeline", () => {
    const generated = buildVideoPromptWithOptionalImage(
      "Giga3 logo reveal on a phone",
      "logo reveal",
      "generated"
    );
    expect(generated).toContain("Giga3 logo reveal");
    expect(generated).toContain("generated opening frame");
    expect(generated).toContain("do not warp letters");
  });
});
