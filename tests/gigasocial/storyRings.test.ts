import { describe, expect, it } from "vitest";
import { buildStoryRingItems, reelsForAuthor } from "@/lib/gigasocial/storyRings";
import type { SocialPost } from "@/lib/gigasocial/types";

function videoPost(id: string, handle: string, createdAt: number): SocialPost {
  return {
    _id: id,
    body: "clip",
    postType: "video",
    mediaType: "video",
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt,
    author: { displayName: handle, handle },
  };
}

describe("storyRings", () => {
  it("builds community plus creator rings", () => {
    const reels = [
      videoPost("1", "alpha", 300),
      videoPost("2", "beta", 200),
      videoPost("3", "alpha", 100),
    ];
    const rings = buildStoryRingItems(reels, new Set());
    expect(rings[0]?.id).toBe("community");
    expect(rings.length).toBeGreaterThan(1);
  });

  it("returns up to three reels per author newest first", () => {
    const reels = [
      videoPost("1", "alpha", 400),
      videoPost("2", "alpha", 300),
      videoPost("3", "alpha", 200),
      videoPost("4", "alpha", 100),
    ];
    const subset = reelsForAuthor(reels, "alpha");
    expect(subset).toHaveLength(3);
    expect(subset.map((post) => post._id)).toEqual(["1", "2", "3"]);
  });

  it("limits chat ring count when maxRings is set", () => {
    const reels = [
      videoPost("1", "a", 400),
      videoPost("2", "b", 300),
      videoPost("3", "c", 200),
      videoPost("4", "d", 100),
    ];
    const rings = buildStoryRingItems(reels, new Set(), { maxRings: 3 });
    expect(rings).toHaveLength(3);
    expect(rings[0]?.id).toBe("community");
  });
});
