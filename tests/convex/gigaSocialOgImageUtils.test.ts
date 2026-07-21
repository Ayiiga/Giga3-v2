import { describe, expect, it } from "vitest";
import {
  isLikelyImageUrl,
  resolveShareThumbnail,
} from "../../convex/gigaSocialOgImageUtils";
import type { PublicSocialPost } from "../../convex/gigaSocialViews";

function mockPost(overrides: Partial<PublicSocialPost> = {}): PublicSocialPost {
  return {
    _id: "post123" as PublicSocialPost["_id"],
    body: "",
    postType: "text",
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt: Date.now(),
    author: { displayName: "Creator", handle: "creator" },
    ...overrides,
  };
}

describe("isLikelyImageUrl", () => {
  it("accepts common image URLs", () => {
    expect(isLikelyImageUrl("https://cdn.example.com/photo.jpg")).toBe(true);
    expect(isLikelyImageUrl("https://cdn.example.com/photo.webp?token=abc")).toBe(true);
  });

  it("rejects video URLs", () => {
    expect(isLikelyImageUrl("https://cdn.example.com/clip.mp4")).toBe(false);
    expect(isLikelyImageUrl("https://storage.example.com/video/upload.mp4")).toBe(false);
  });

  it("rejects non-http URLs", () => {
    expect(isLikelyImageUrl("data:image/jpeg;base64,abc")).toBe(false);
  });
});

describe("resolveShareThumbnail", () => {
  it("prefers video thumbnail over primary media URL", () => {
    const bundle = {
      post: mockPost({
        mediaType: "video",
        postType: "video",
        mediaUrl: "https://cdn.example.com/video.mp4",
        videoThumbnailUrl: "https://cdn.example.com/thumb.jpg",
      }),
    };
    expect(resolveShareThumbnail(bundle)).toBe("https://cdn.example.com/thumb.jpg");
  });

  it("skips mp4 when no thumbnail is stored", () => {
    const bundle = {
      post: mockPost({
        mediaType: "video",
        postType: "video",
        mediaUrl: "https://cdn.example.com/video.mp4",
      }),
      mediaMetaJson: JSON.stringify([
        { url: "https://cdn.example.com/video.mp4", type: "video" },
      ]),
    };
    expect(resolveShareThumbnail(bundle)).toBeNull();
  });

  it("returns image media from metadata", () => {
    const bundle = {
      post: mockPost({
        mediaType: "image",
        postType: "image",
        mediaUrl: "https://cdn.example.com/photo.png",
      }),
    };
    expect(resolveShareThumbnail(bundle)).toBe("https://cdn.example.com/photo.png");
  });

  it("supports legacy data URL thumbnails", () => {
    const dataUrl = "data:image/jpeg;base64,ZmFrZQ==";
    const bundle = {
      post: mockPost({
        mediaType: "video",
        postType: "video",
        videoThumbnailUrl: dataUrl,
        mediaUrl: "https://cdn.example.com/video.mp4",
      }),
    };
    expect(resolveShareThumbnail(bundle)).toBe(dataUrl);
  });
});
