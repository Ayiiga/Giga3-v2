import { describe, expect, it } from "vitest";
import {
  offlineViewedReels,
  STORIES_SNAPSHOT_MAX_AGE_MS,
} from "@/lib/gigasocial/storiesOfflineSnapshot";
import type { SocialPost } from "@/lib/gigasocial/types";

function reel(id: string): SocialPost {
  return {
    _id: id,
    body: "",
    postType: "video",
    mediaType: "video",
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    createdAt: Date.now(),
    author: { displayName: "A", handle: "a" },
  };
}

describe("offlineViewedReels", () => {
  it("returns only viewed posts from snapshot", () => {
    const snapshot = [reel("a"), reel("b"), reel("c")];
    const viewed = new Set(["a", "c"]);
    expect(offlineViewedReels(snapshot, viewed).map((p) => p._id)).toEqual(["a", "c"]);
  });

  it("returns empty when snapshot is null", () => {
    expect(offlineViewedReels(null, new Set(["a"]))).toEqual([]);
  });
});

describe("STORIES_SNAPSHOT_MAX_AGE_MS", () => {
  it("uses a 24-hour offline window", () => {
    expect(STORIES_SNAPSHOT_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
  });
});
