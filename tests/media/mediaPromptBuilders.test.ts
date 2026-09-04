import { describe, expect, it } from "vitest";
import { buildImagePrompt, buildVideoPrompt } from "../../convex/mediaCatalog";
import { buildVideoAiPrompt } from "../../convex/videoCatalog";

describe("media prompt builders", () => {
  it("skips category suffix when Media Studio already enriched the image prompt", () => {
    const enriched =
      "A red sports car. High-detail composition, realistic lighting. Target canvas size: YouTube.";
    expect(buildImagePrompt("anime_art", enriched)).toBe(enriched);
  });

  it("appends a light category suffix for plain image prompts", () => {
    expect(buildImagePrompt("anime_art", "A red sports car")).toContain("anime art style");
  });

  it("keeps video prompts literal without heavy category suffixes", () => {
    expect(buildVideoPrompt("cinematic_trailers", "Sunset over Lagos harbour")).toBe(
      "Sunset over Lagos harbour"
    );
  });

  it("adds a talking-head hint only for avatar prompts that omit speech cues", () => {
    expect(buildVideoAiPrompt("talking_avatar", "News anchor in a blue suit")).toContain(
      "lip sync"
    );
    expect(buildVideoAiPrompt("talking_avatar", "Presenter speaking to camera")).toBe(
      "Presenter speaking to camera"
    );
  });
});
