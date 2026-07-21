import { describe, expect, it } from "vitest";
import {
  CREATOR_LEVELS,
  creatorLevelProgress,
  formatCreatorRanks,
  nextCreatorLevel,
  resolveCreatorLevel,
} from "../../web/lib/gigasocial/creatorLevels";
import {
  resolveAutoVideoQuality,
  resolveEffectiveDataSaver,
  shouldDeferMediaLoad,
} from "../../web/lib/gigasocial/dataSaver";
import { pickAdaptiveStreamUrl } from "../../web/lib/gigasocial/adaptiveVideo";
import { rankFeedPost, sortPostsForYou } from "../../web/lib/gigasocial/feedRanking";
import type { SocialPost } from "../../web/lib/gigasocial/types";

describe("creatorLevels", () => {
  it("maps XP levels onto the New → Legend ladder", () => {
    expect(resolveCreatorLevel(1).id).toBe("new");
    expect(resolveCreatorLevel(3).label).toBe("Growing Creator");
    expect(resolveCreatorLevel(12).id).toBe("diamond");
    expect(resolveCreatorLevel(20).id).toBe("legend");
    expect(CREATOR_LEVELS).toHaveLength(6);
    expect(nextCreatorLevel(1)?.id).toBe("growing");
    expect(creatorLevelProgress(4)).toBeGreaterThan(0);
  });

  it("formats display ranks without schema changes", () => {
    const ranks = formatCreatorRanks({ fanCount: 600, engagementRate: 2.5 });
    expect(ranks.creatorRank).toContain("Creator");
    expect(ranks.localRank).toBe("Top Local");
  });
});

describe("dataSaver + adaptive video", () => {
  it("promotes browser saveData into saver mode", () => {
    expect(resolveEffectiveDataSaver("off", { saveData: true })).toBe("saver");
    expect(shouldDeferMediaLoad("ultra")).toBe(true);
    expect(resolveAutoVideoQuality("ultra", "auto", {})).toBe("audio");
    expect(resolveAutoVideoQuality("saver", "auto", { isSlowNetwork: true })).toBe("360p");
  });

  it("falls back safely when only one stream exists", () => {
    const picked = pickAdaptiveStreamUrl("https://cdn.example/v.mp4", undefined, "720p");
    expect(picked.url).toContain("v.mp4");
    expect(picked.audioOnly).toBe(false);
    expect(pickAdaptiveStreamUrl("https://cdn.example/v.mp4", undefined, "audio").audioOnly).toBe(
      true
    );
  });
});

describe("feedRanking", () => {
  const base = (overrides: Partial<SocialPost>): SocialPost => ({
    _id: overrides._id ?? "1",
    body: overrides.body ?? "hello africa",
    postType: overrides.postType ?? "text",
    likeCount: overrides.likeCount ?? 0,
    commentCount: overrides.commentCount ?? 0,
    shareCount: overrides.shareCount ?? 0,
    createdAt: overrides.createdAt ?? Date.now(),
    author: overrides.author ?? { displayName: "A", handle: "a" },
    ...overrides,
  });

  it("ranks engaged posts higher", () => {
    const low = base({ _id: "low", likeCount: 0, shareCount: 0 });
    const high = base({
      _id: "high",
      likeCount: 20,
      shareCount: 5,
      commentCount: 4,
      author: { displayName: "B", handle: "b", supportingByMe: true },
    });
    expect(rankFeedPost(high)).toBeGreaterThan(rankFeedPost(low));
    expect(sortPostsForYou([low, high])[0]._id).toBe("high");
  });
});
