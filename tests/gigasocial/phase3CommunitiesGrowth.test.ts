import { describe, expect, it } from "vitest";
import { SOCIAL_COMMUNITIES, getCommunityBySlug } from "../../convex/gigaSocialCommunities";
import {
  buildCommunityInviteLink,
  communityMatchesType,
  COMMUNITY_FEATURES,
} from "../../web/lib/gigasocial/communitiesCatalog";
import { suggestCommunities } from "../../web/lib/gigasocial/communityDiscovery";
import {
  buildCommunityInsights,
  buildModerationSuggestions,
} from "../../web/lib/gigasocial/communityAssistant";
import { CREATOR_CHALLENGES, scoreForChallenge } from "../../web/lib/gigasocial/challenges";
import {
  canClaimDailyLogin,
  claimDailyLogin,
  type DailyRewardState,
} from "../../web/lib/gigasocial/dailyRewards";
import {
  categorizeNotification,
  groupNotifications,
} from "../../web/lib/gigasocial/notificationGroups";
import { resolveLoyaltyLevel, LOYALTY_LEVELS } from "../../web/lib/gigasocial/loyaltyLevels";
import { GIGASOCIAL_MODULES, listSocialPlugins } from "../../web/lib/gigasocial/plugins/registry";
import { runSocialAi } from "../../web/lib/gigasocial/socialAiRouter";
import { buildGigaSocialApiBase, getDefaultApiVersion } from "../../web/lib/gigasocial/apiVersion";
import type { SocialCommunity, SocialNotification } from "../../web/lib/gigasocial/types";

describe("Phase 3 communities catalog", () => {
  it("keeps legacy slugs and adds Phase 3 types", () => {
    expect(getCommunityBySlug("education")?.name).toBe("Education");
    expect(getCommunityBySlug("churches")?.communityType).toBe("churches");
    expect(getCommunityBySlug("students")?.slug).toBe("students");
    expect(SOCIAL_COMMUNITIES.length).toBeGreaterThanOrEqual(20);
    expect(COMMUNITY_FEATURES.map((f) => f.id)).toContain("ai-assistant");
    expect(buildCommunityInviteLink("ai", "https://www.giga3ai.com")).toContain(
      "tab=communities"
    );
  });

  it("ranks discovery suggestions for unjoined communities", () => {
    const communities: SocialCommunity[] = [
      {
        slug: "ai",
        name: "AI",
        category: "AI",
        description: "AI tips",
        emoji: "🤖",
        memberCount: 10,
        joined: false,
        communityType: "ai",
      },
      {
        slug: "sports-clubs",
        name: "Sports",
        category: "Sports",
        description: "Football",
        emoji: "⚽",
        memberCount: 3,
        joined: true,
        communityType: "sports",
      },
    ];
    const suggestions = suggestCommunities(communities, { interests: ["ai"] });
    expect(suggestions[0]?.slug).toBe("ai");
    expect(communityMatchesType(communities[0], "ai")).toBe(true);
  });

  it("never auto-removes content in moderation suggestions", () => {
    const suggestions = buildModerationSuggestions("buy now crypto giveaway");
    expect(suggestions.some((s) => s.action === "recommend_review")).toBe(true);
    expect(suggestions.every((s) => s.action.startsWith("recommend_"))).toBe(true);
    expect(buildCommunityInsights({ name: "AI", memberCount: 2, category: "AI" }).length).toBeGreaterThan(
      0
    );
  });
});

describe("Phase 3 growth + architecture", () => {
  it("defines loyalty ladder and challenges", () => {
    expect(LOYALTY_LEVELS).toHaveLength(6);
    expect(resolveLoyaltyLevel(0).id).toBe("explorer");
    expect(resolveLoyaltyLevel(2000).id).toBe("legend");
    expect(CREATOR_CHALLENGES).toHaveLength(8);
    expect(
      scoreForChallenge(CREATOR_CHALLENGES[0], {
        body: "funny skit comedy",
        likeCount: 5,
        hashtags: ["comedy"],
      })
    ).toBeGreaterThan(0);
  });

  it("tracks daily login claims without double claiming", () => {
    const initial: DailyRewardState = {
      lastClaimDate: null,
      streakDays: 0,
      totalClaims: 0,
      weeklyChallengeProgress: 0,
    };
    const now = new Date("2026-07-21T12:00:00Z");
    expect(canClaimDailyLogin(initial, now)).toBe(true);
    const claimed = claimDailyLogin(initial, now);
    expect(claimed.totalClaims).toBe(1);
    expect(canClaimDailyLogin(claimed, now)).toBe(false);
  });

  it("groups notifications into smart categories", () => {
    const items: SocialNotification[] = [
      {
        _id: "1",
        type: "community",
        message: "joined education",
        read: false,
        createdAt: 1,
        communitySlug: "education",
        actor: null,
      },
      {
        _id: "2",
        type: "like",
        message: "liked your post",
        read: false,
        createdAt: 2,
        actor: { displayName: "A", handle: "a" },
      },
    ];
    expect(categorizeNotification(items[0])).toBe("community");
    expect(categorizeNotification(items[1])).toBe("creator");
    expect(groupNotifications(items).map((g) => g.category)).toEqual(
      expect.arrayContaining(["community", "creator"])
    );
  });

  it("keeps API v1 default and plugin modules modular", async () => {
    expect(getDefaultApiVersion()).toBe("v1");
    expect(buildGigaSocialApiBase("https://example.convex.site", "v2")).toContain("/api/v1");
    expect(GIGASOCIAL_MODULES).toContain("communities");
    expect(listSocialPlugins().length).toBeGreaterThan(0);
    const ai = await runSocialAi({ kind: "insight", prompt: "hello" });
    expect(ai.suggestionOnly).toBe(true);
    expect(ai.provider).toBe("local");
  });
});
