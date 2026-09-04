import { describe, expect, it } from "vitest";
import {
  buildReadableTextImagePrompt,
  videoAspectToFalImageSize,
} from "../../convex/mediaVideoTextPipeline";
import { motionOnlyVideoPromptFromImage } from "../../convex/mediaVideoPrompt";

describe("mediaVideoTextPipeline", () => {
  it("maps video aspect ratios to fal image sizes", () => {
    expect(videoAspectToFalImageSize("9:16")).toBe("portrait_16_9");
    expect(videoAspectToFalImageSize("16:9")).toBe("landscape_16_9");
    expect(videoAspectToFalImageSize("1:1")).toBe("square_hd");
  });

  it("emphasizes legible English typography in the still-frame prompt", () => {
    const prompt = buildReadableTextImagePrompt("Giga3 logo on a phone screen", "marketing_assets");
    expect(prompt).toContain("English");
    expect(prompt).toContain("Latin alphabet");
    expect(prompt.toLowerCase()).toContain("giga3");
  });

  it("uses motion-only guidance when animating a text frame", () => {
    const motion = motionOnlyVideoPromptFromImage("Giga3 app promo with logo");
    expect(motion).toContain("Preserve every English letter");
    expect(motion).toContain("no invented characters");
  });
});
