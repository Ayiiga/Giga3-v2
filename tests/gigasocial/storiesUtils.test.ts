import { describe, expect, it } from "vitest";
import {
  extractStoryReels,
  isStoryEligiblePost,
  postHasStoryMarker,
} from "@/lib/gigasocial/storiesUtils";
import type { SocialPost } from "@/lib/gigasocial/types";

function basePost(overrides: Partial<SocialPost>): SocialPost {
  return {
    _id: "p1",
    body: "Post",
    postType: "image",
    mediaType: "image",
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt: 100,
    author: {
      displayName: "Creator",
      handle: "creator",
    },
    ...overrides,
  };
}

function makeVideoPost(id: string, createdAt: number): SocialPost {
  return basePost({
    _id: id,
    body: "Video post",
    postType: "video",
    mediaType: "video",
    videoDurationSec: 12,
    mediaUrl: "https://example.com/video.mp4",
    createdAt,
  });
}

function makeImageStory(id: string, createdAt: number): SocialPost {
  return basePost({
    _id: id,
    body: "✨ Story\n\n#story",
    postType: "image",
    mediaType: "image",
    mediaUrl: "https://example.com/photo.jpg",
    hashtags: ["story"],
    createdAt,
  });
}

describe("extractStoryReels", () => {
  it("returns public video posts newest first", () => {
    const posts = [
      makeVideoPost("a", 100),
      makeVideoPost("b", 300),
      makeVideoPost("c", 200),
    ];
    const reels = extractStoryReels(posts);
    expect(reels.map((post) => post._id)).toEqual(["b", "c", "a"]);
  });

  it("includes image stories tagged #story alongside videos", () => {
    const posts = [
      makeVideoPost("video", 100),
      makeImageStory("photo-story", 200),
      basePost({
        _id: "plain-photo",
        body: "Just a feed photo",
        mediaUrl: "https://example.com/plain.jpg",
        createdAt: 300,
      }),
    ];
    const reels = extractStoryReels(posts);
    expect(reels.map((post) => post._id)).toEqual(["photo-story", "video"]);
  });

  it("skips followers-only posts", () => {
    const posts = [
      { ...makeVideoPost("private", 400), visibility: "followers" as const },
      makeVideoPost("public", 100),
    ];
    const reels = extractStoryReels(posts);
    expect(reels.map((post) => post._id)).toEqual(["public"]);
  });
});

describe("story markers", () => {
  it("detects #story in body or hashtags", () => {
    expect(postHasStoryMarker(makeImageStory("a", 1))).toBe(true);
    expect(
      postHasStoryMarker(
        basePost({ body: "hello #Story world", mediaUrl: "https://example.com/a.jpg" })
      )
    ).toBe(true);
    expect(
      isStoryEligiblePost(
        basePost({
          body: "no marker",
          mediaUrl: "https://example.com/a.jpg",
        })
      )
    ).toBe(false);
  });
});
