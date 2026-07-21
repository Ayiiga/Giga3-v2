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
  it("builds Convex preview URL for shares", () => {
    const copy = buildGigaSocialShareCopy(mockPost());
    expect(copy.url).toMatch(/\/gigasocial\/post\/preview\?id=post123$/);
    expect(copy.url).not.toContain("giga3ai.com/gigasocial/post");
  });

  it("uses og-image proxy for preview thumbnails", () => {
    const imageUrl = previewImageUrl(mockPost());
    expect(imageUrl).toMatch(/\/gigasocial\/post\/og-image\?id=post123$/);
  });
});
