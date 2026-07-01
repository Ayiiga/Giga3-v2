import { describe, expect, it } from "vitest";
import { buildMultimodalPrompt } from "../../convex/multimodalPrompt";
import { shouldEnableWebSearch } from "../../convex/providerRouter";
import { parseMessageMedia } from "../../web/lib/chat/parseMessageMedia";

describe("multimodalPrompt", () => {
  it("includes attachment metadata for vision requests", () => {
    const prompt = buildMultimodalPrompt("What is in this screenshot?", [
      {
        kind: "image",
        name: "screen.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 210_700,
        text: "Image attached for visual analysis.",
      },
    ]);
    expect(prompt).toContain("What is in this screenshot?");
    expect(prompt).toContain("screen.jpg");
    expect(prompt).toContain("Analyze every uploaded item");
  });
});

describe("providerRouter web search", () => {
  it("disables web search when an image is attached", () => {
    expect(shouldEnableWebSearch("latest news today", "general", true)).toBe(false);
    expect(shouldEnableWebSearch("latest news today", "general", false)).toBe(true);
  });
});

describe("parseMessageMedia data URLs", () => {
  it("extracts inline markdown image thumbnails from user messages", () => {
    const dataUrl = "data:image/jpeg;base64,abc123";
    const parsed = parseMessageMedia(`Analyze this image.\n\n![shot.jpg](${dataUrl})`);
    expect(parsed.text).toBe("Analyze this image.");
    expect(parsed.images).toEqual([dataUrl]);
  });
});
