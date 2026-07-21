import { describe, expect, it } from "vitest";
import { buildGigaSocialOgMeta } from "../../convex/gigaSocialOg";
import type { PublicSocialPost } from "../../convex/gigaSocialViews";

function mockPost(overrides: Partial<PublicSocialPost> = {}): PublicSocialPost {
  return {
    _id: "post123" as PublicSocialPost["_id"],
    body: "Hello world",
    postType: "video",
    mediaType: "video",
    mediaUrl: "https://cdn.example.com/video.mp4",
    videoThumbnailUrl: "https://cdn.example.com/thumb.jpg",
    likeCount: 3,
    commentCount: 0,
    shareCount: 0,
    viewCount: 10,
    createdAt: Date.now(),
    author: { displayName: "Creator", handle: "creator" },
    ...overrides,
  };
}

describe("buildGigaSocialOgMeta", () => {
  it("always points og:image at the Convex proxy endpoint", () => {
    const meta = buildGigaSocialOgMeta(mockPost(), "https://www.giga3ai.com");
    expect(meta.imageUrl).toMatch(/\/gigasocial\/post\/og-image\?id=post123$/);
    expect(meta.imageUrl).not.toContain("thumb.jpg");
    expect(meta.imageUrl).not.toContain("video.mp4");
  });

  it("uses canonical post URL for og:url", () => {
    const meta = buildGigaSocialOgMeta(mockPost(), "https://www.giga3ai.com");
    expect(meta.canonicalUrl).toBe(
      "https://www.giga3ai.com/gigasocial/post/?id=post123"
    );
  });
});
