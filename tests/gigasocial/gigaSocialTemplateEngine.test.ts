import { describe, expect, it } from "vitest";
import {
  analyzePostForTemplate,
  availableTemplateModes,
  checkTemplateEligibility,
  inferTemplateCategories,
} from "../../convex/gigaSocialTemplateEngine";

describe("gigaSocialTemplateEngine", () => {
  const baseAnalysis = analyzePostForTemplate({
    postId: "post123",
    authorId: "creator1",
    authorHandle: "kwame",
    body: "Funny Ghanaian comedy about relationships #comedy #ghana",
    hashtags: ["comedy", "ghana"],
    mediaItems: [{ url: "https://example.com/v.mp4", type: "video", durationSec: 12 }],
    mediaType: "video",
    postType: "video",
    videoDurationSec: 12,
    templatePolicy: "public",
  });

  it("infers comedy and ghana categories from hashtags and body", () => {
    const categories = inferTemplateCategories(
      ["comedy", "ghana"],
      "Funny Ghanaian comedy about relationships",
      "video"
    );
    expect(categories).toContain("comedy");
    expect(categories).toContain("ghana");
  });

  it("offers video, sound, and full modes for video posts", () => {
    const modes = availableTemplateModes(baseAnalysis);
    expect(modes).toContain("video");
    expect(modes).toContain("sound");
    expect(modes).toContain("full");
  });

  it("blocks template use when policy is off for non-owners", () => {
    const eligibility = checkTemplateEligibility({
      policy: "off",
      viewerId: "viewer1",
      authorId: "creator1",
      isFan: false,
      visibility: "public",
      analysis: baseAnalysis,
    });
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reason).toMatch(/not enabled/i);
  });

  it("allows owner regardless of policy", () => {
    const eligibility = checkTemplateEligibility({
      policy: "off",
      viewerId: "creator1",
      authorId: "creator1",
      isFan: false,
      visibility: "public",
      analysis: baseAnalysis,
    });
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.isOwner).toBe(true);
  });

  it("requires fan status when policy is fans", () => {
    const blocked = checkTemplateEligibility({
      policy: "fans",
      viewerId: "viewer1",
      authorId: "creator1",
      isFan: false,
      visibility: "public",
      analysis: baseAnalysis,
    });
    expect(blocked.eligible).toBe(false);

    const allowed = checkTemplateEligibility({
      policy: "fans",
      viewerId: "viewer1",
      authorId: "creator1",
      isFan: true,
      visibility: "public",
      analysis: baseAnalysis,
    });
    expect(allowed.eligible).toBe(true);
  });

  it("includes attribution line and originality constraints", () => {
    expect(baseAnalysis.attributionLine).toBe("Inspired by a GigaSocial template by @kwame.");
    expect(baseAnalysis.generationConstraints.join(" ")).toMatch(/never duplicate/i);
  });
});
