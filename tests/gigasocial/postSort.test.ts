import { describe, expect, it } from "vitest";
import { compareNewestWithPins, sortPostsNewestFirst } from "../../web/lib/gigasocial/postSort";
import type { SocialPost } from "../../web/lib/gigasocial/types";

function post(partial: Partial<SocialPost> & { _id: string; createdAt: number }): SocialPost {
  return {
    body: "",
    postType: "text",
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    author: { displayName: "A", handle: "a" },
    ...partial,
  };
}

describe("postSort", () => {
  it("orders newest first", () => {
    const sorted = sortPostsNewestFirst([
      post({ _id: "1", createdAt: 100 }),
      post({ _id: "2", createdAt: 300 }),
      post({ _id: "3", createdAt: 200 }),
    ]);
    expect(sorted.map((p) => p._id)).toEqual(["2", "3", "1"]);
  });

  it("floats pinned posts above newer unpinned posts", () => {
    const sorted = sortPostsNewestFirst([
      post({ _id: "new", createdAt: 500 }),
      post({ _id: "pinned-old", createdAt: 100, pinnedAt: 400 }),
      post({ _id: "mid", createdAt: 300 }),
    ]);
    expect(sorted.map((p) => p._id)).toEqual(["pinned-old", "new", "mid"]);
  });

  it("orders multiple pins by pinnedAt then createdAt", () => {
    expect(
      compareNewestWithPins(
        { createdAt: 1, pinnedAt: 10 },
        { createdAt: 9, pinnedAt: 20 }
      )
    ).toBeGreaterThan(0);
  });
});
