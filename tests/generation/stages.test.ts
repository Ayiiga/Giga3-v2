import { describe, expect, it } from "vitest";
import {
  generationStageForElapsed,
  IMAGE_GENERATION_STAGES,
  VIDEO_GENERATION_STAGES,
} from "../../web/lib/generation/stages";

describe("generationStageForElapsed", () => {
  it("starts image generation in preparing stage", () => {
    expect(generationStageForElapsed("image", 0).label).toBe(
      IMAGE_GENERATION_STAGES[0].label
    );
  });

  it("advances image stages over time", () => {
    expect(generationStageForElapsed("image", 3000).label).toBe("Generating image…");
    expect(generationStageForElapsed("image", 30_000).label).toBe("Finalizing…");
  });

  it("advances video stages over time", () => {
    expect(generationStageForElapsed("video", 5000).label).toBe("Rendering…");
    expect(generationStageForElapsed("video", 60_000).label).toBe(
      VIDEO_GENERATION_STAGES[VIDEO_GENERATION_STAGES.length - 1].label
    );
  });
});
