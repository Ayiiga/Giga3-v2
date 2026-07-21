import { describe, expect, it } from "vitest";
import {
  POST_AI_ACTIONS,
  improveCaption,
  predictEngagement,
  rewriteCaption,
  runPostAIAction,
  suggestBestPostTime,
  suggestHashtags,
  translateCaption,
} from "../../web/lib/gigasocial/aiAssistant";

describe("post AI actions", () => {
  it("exposes the full AI toolbar catalog", () => {
    expect(POST_AI_ACTIONS.map((a) => a.id)).toEqual([
      "improve-caption",
      "rewrite-caption",
      "generate-hashtags",
      "translate",
      "generate-thumbnail",
      "generate-cover",
      "engagement-prediction",
      "reply-with-ai",
      "best-time",
      "suggest-music",
      "generate-short-clip",
    ]);
  });

  it("never returns empty suggestions for non-empty captions", () => {
    const body = "Learn AI with Giga3 in Ghana";
    expect(improveCaption(body).length).toBeGreaterThan(body.length - 1);
    expect(rewriteCaption(body)).toContain("GigaSocial");
    expect(suggestHashtags(body, "education").length).toBeGreaterThan(0);
    expect(translateCaption(body, "fr")).toContain("[FR]");
    expect(predictEngagement({ body, likeCount: 4, commentCount: 1 })).toMatch(/Predicted/);
    expect(suggestBestPostTime(new Date("2026-07-21T19:00:00")).toLowerCase()).toMatch(
      /peak|6–9|6-9|evening|post/
    );
    expect(runPostAIAction("suggest-music", { body })).toMatch(/BPM|instrumental|amapiano|Afro/i);
  });
});
