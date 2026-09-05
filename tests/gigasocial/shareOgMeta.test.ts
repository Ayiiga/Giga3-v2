import { describe, expect, it } from "vitest";
import { buildGigaSocialShareCopy, previewImageUrl } from "@/lib/gigasocial/ogMeta";
import type { SocialPost } from "@/lib/gigasocial/types";

function mockPost(overrides: Partial<SocialPost> = {}): SocialPost {
  return {
    _id: "post123",
    body: "Check this out",
    postType: "video",
    mediaType: "video",
    mediaUrl: "https://cdn.example.com/video.mp4",
    videoThumbnailUrl: "https://cdn.example.com/thumb.jpg",
    likeCount: 1,
    commentCount: 0,
    shareCount: 0,
    createdAt: Date.now(),
    author: { displayName: "Creator", handle: "creator" },
    ...overrides,
  };
}

describe("gigasocial share og meta", () => {
  it("builds canonical giga3ai.com post URL for shares", () => {
    const copy = buildGigaSocialShareCopy(mockPost());
    expect(copy.url).toBe("https://www.giga3ai.com/gigasocial/post/post123/");
    expect(copy.url).not.toContain("convex.site");
    expect(copy.url).not.toContain("preview?id=");
  });

  it("uses article-style title and description for previews", () => {
    const copy = buildGigaSocialShareCopy(
      mockPost({ body: "Ghana update\n\nDetails here." })
    );
    expect(copy.title).toContain("Ghana update");
    expect(copy.title).toContain("GigaSocial");
    expect(copy.text).toContain("views");
  });

  it("prefers direct image thumbnails when available", () => {
    const imageUrl = previewImageUrl(
      mockPost({
        postType: "image",
        mediaType: "image",
        videoThumbnailUrl: undefined,
        mediaUrl: "https://cdn.example.com/photo.jpg",
      })
    );
    expect(imageUrl).toBe("https://cdn.example.com/photo.jpg");
  });

  it("falls back to giga3ai og-image proxy when no direct thumbnail exists", () => {
    const imageUrl = previewImageUrl(
      mockPost({ videoThumbnailUrl: undefined, mediaUrl: "https://cdn.example.com/video.mp4" })
    );
    expect(imageUrl).toBe("https://www.giga3ai.com/gigasocial/post/post123/og-image/");
    expect(imageUrl).not.toContain("convex.site");
  });
});
