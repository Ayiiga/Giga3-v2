import { describe, expect, it } from "vitest";
import { extractStoryReels } from "@/lib/gigasocial/storiesUtils";
import type { SocialPost } from "@/lib/gigasocial/types";

function makeVideoPost(id: string, createdAt: number): SocialPost {
  return {
    _id: id,
    body: "Video post",
    postType: "video",
    mediaType: "video",
    videoDurationSec: 12,
    mediaUrl: "https://example.com/video.mp4",
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt,
    author: {
      displayName: "Creator",
      handle: "creator",
    },
  };
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

  it("skips followers-only posts", () => {
    const posts = [
      { ...makeVideoPost("private", 400), visibility: "followers" as const },
      makeVideoPost("public", 100),
    ];
    const reels = extractStoryReels(posts);
    expect(reels.map((post) => post._id)).toEqual(["public"]);
  });
});
