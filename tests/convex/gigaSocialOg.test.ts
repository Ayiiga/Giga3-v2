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
  it("uses direct thumbnail URLs for og:image when available", () => {
    const meta = buildGigaSocialOgMeta(mockPost(), "https://www.giga3ai.com");
    expect(meta.imageUrl).toBe("https://cdn.example.com/thumb.jpg");
    expect(meta.imageUrl).not.toContain("convex.site");
  });

  it("uses giga3ai og-image proxy for Convex storage thumbnails", () => {
    const meta = buildGigaSocialOgMeta(
      mockPost({
        postType: "image",
        mediaType: "image",
        videoThumbnailUrl: undefined,
        mediaUrl:
          "https://perfect-lark-521.convex.cloud/api/storage/b028a5a6-f594-4284-bcc4-e44dd06ebcae",
      }),
      "https://www.giga3ai.com"
    );
    expect(meta.imageUrl).toBe("https://www.giga3ai.com/gigasocial/post/post123/og-image/");
    expect(meta.imageUrl).not.toContain("convex.cloud");
  });

  it("uses giga3ai og-image proxy when no direct thumbnail exists", () => {
    const meta = buildGigaSocialOgMeta(
      mockPost({ videoThumbnailUrl: undefined, mediaUrl: "https://cdn.example.com/video.mp4" }),
      "https://www.giga3ai.com"
    );
    expect(meta.imageUrl).toBe("https://www.giga3ai.com/gigasocial/post/post123/og-image/");
  });

  it("uses canonical giga3ai post URL for og:url", () => {
    const meta = buildGigaSocialOgMeta(mockPost(), "https://www.giga3ai.com");
    expect(meta.canonicalUrl).toBe("https://www.giga3ai.com/gigasocial/post/post123/");
  });

  it("uses article-style titles instead of raw stats", () => {
    const meta = buildGigaSocialOgMeta(
      mockPost({ body: "Breaking news headline\n\nMore details." }),
      "https://www.giga3ai.com"
    );
    expect(meta.title).toContain("Breaking news headline");
    expect(meta.title).toContain("GigaSocial");
    expect(meta.description).toContain("views");
  });
});
