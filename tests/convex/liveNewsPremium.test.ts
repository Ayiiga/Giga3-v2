import { describe, expect, it } from "vitest";
import { formatLiveNewsBriefing } from "../../convex/liveNewsShared";
import {
  IMAGE_UPGRADE_MARKDOWN,
  resolveImageGenerationDecision,
  shouldOfferOpenAiImageGeneration,
} from "../../convex/premiumImage";

describe("formatLiveNewsBriefing", () => {
  it("formats cached headlines with source links", () => {
    const text = formatLiveNewsBriefing([
      {
        category: "World",
        items: [
          {
            title: "Leaders meet at summit",
            link: "https://example.com/a",
            publishedAt: null,
            source: "BBC World",
            platform: "News",
            category: "world",
          },
        ],
      },
    ]);
    expect(text).toContain("Leaders meet at summit");
    expect(text).toContain("https://example.com/a");
  });
});

describe("premium image gating", () => {
  const future = Date.now() + 86_400_000;

  it("allows OpenAI images for active subscribers", () => {
    expect(shouldOfferOpenAiImageGeneration("pro", future)).toBe(true);
    expect(resolveImageGenerationDecision("pro", future).action).toBe("openai");
  });

  it("allows OpenAI-first images for free accounts using credits", () => {
    expect(shouldOfferOpenAiImageGeneration("free", null)).toBe(true);
    expect(resolveImageGenerationDecision("free", null).action).toBe("openai");
  });

  it("includes subscribe link in upgrade markdown", () => {
    expect(IMAGE_UPGRADE_MARKDOWN).toContain("/subscribe/");
  });
});
