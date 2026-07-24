import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { parseGamification } from "./gigaSocialViews";
import type { Doc, Id } from "./_generated/dataModel";

type DbCtx = { db: import("./_generated/server").QueryCtx["db"] };

export type EconomySettings = {
  minFansForMonetization: number;
  viewRewardRateGhs: number;
  watchTimeRewardRateGhsPerMin: number;
  engagementRewardRateGhs: number;
  giftCreatorSharePercent: number;
  affiliateCommissionPercent: number;
  creditsToGhsRate: number;
  boostBudgetMinGhs: number;
  boostBudgetMaxGhs: number;
  boostDurationDays: number[];
};

export const DEFAULT_ECONOMY_SETTINGS: EconomySettings = {
  minFansForMonetization: 500,
  viewRewardRateGhs: 0.001,
  watchTimeRewardRateGhsPerMin: 0.01,
  engagementRewardRateGhs: 0.05,
  giftCreatorSharePercent: 80,
  affiliateCommissionPercent: 10,
  creditsToGhsRate: 0.1,
  boostBudgetMinGhs: 10,
  boostBudgetMaxGhs: 2000,
  boostDurationDays: [1, 3, 5, 7, 14, 21, 30, 60, 90],
};

const ECONOMY_CONFIG_KEYS: Record<keyof EconomySettings, string> = {
  minFansForMonetization: "gigasocial.economy.minFans",
  viewRewardRateGhs: "gigasocial.economy.viewRewardRate",
  watchTimeRewardRateGhsPerMin: "gigasocial.economy.watchTimeRate",
  engagementRewardRateGhs: "gigasocial.economy.engagementRate",
  giftCreatorSharePercent: "gigasocial.economy.giftSharePercent",
  affiliateCommissionPercent: "gigasocial.economy.affiliatePercent",
  creditsToGhsRate: "gigasocial.economy.creditsToGhs",
  boostBudgetMinGhs: "gigasocial.economy.boostMinGhs",
  boostBudgetMaxGhs: "gigasocial.economy.boostMaxGhs",
  boostDurationDays: "gigasocial.economy.boostDurations",
};

type EconomyJson = {
  affiliateCode?: string;
  monetizationUnlockedAt?: number;
  unlockNotified?: boolean;
};

type PrivacySettings = {
  showPosts?: boolean;
  showPhotos?: boolean;
  showVideos?: boolean;
  showAiCreations?: boolean;
  showMarketplace?: boolean;
  showActivity?: boolean;
};

export function parseEconomyJson(raw?: string | null): EconomyJson {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as EconomyJson;
  } catch {
    return {};
  }
}

export function parsePrivacySettings(raw?: string | null): PrivacySettings {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PrivacySettings;
  } catch {
    return {};
  }
}

function serializeEconomyJson(data: EconomyJson): string {
  return JSON.stringify(data);
}

export async function loadEconomySettings(ctx: DbCtx): Promise<EconomySettings> {
  const rows = await ctx.db.query("remoteConfigEntries").take(200);
  const settings = { ...DEFAULT_ECONOMY_SETTINGS };

  for (const [field, key] of Object.entries(ECONOMY_CONFIG_KEYS) as [
    keyof EconomySettings,
    string,
  ][]) {
    const row = rows.find((r) => r.key === key);
    if (!row?.value) continue;
    if (field === "boostDurationDays") {
      const parsed = row.value
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (parsed.length) settings.boostDurationDays = parsed;
      continue;
    }
    const num = Number(row.value);
    if (Number.isFinite(num)) {
      (settings as Record<string, number>)[field] = num;
    }
  }

  return settings;
}

async function getFanCount(ctx: DbCtx, userId: string): Promise<number> {
  const fans = await ctx.db
    .query("socialFollows")
    .withIndex("by_following", (q) => q.eq("followingId", userId))
    .collect();
  return fans.length;
}

async function getSupportingCount(ctx: DbCtx, userId: string): Promise<number> {
  const rows = await ctx.db
    .query("socialFollows")
    .withIndex("by_follower", (q) => q.eq("followerId", userId))
    .collect();
  return rows.length;
}

async function getMutualFanCount(
  ctx: DbCtx,
  userId: string,
  otherUserId: string
): Promise<number> {
  const [myFans, theirFans] = await Promise.all([
    ctx.db
      .query("socialFollows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .collect(),
    ctx.db
      .query("socialFollows")
      .withIndex("by_following", (q) => q.eq("followingId", otherUserId))
      .collect(),
  ]);
  const myFanIds = new Set(myFans.map((f) => f.followerId));
  return theirFans.filter((f) => myFanIds.has(f.followerId)).length;
}

export async function isMonetizationUnlocked(
  ctx: DbCtx,
  profile: Doc<"socialProfiles">,
  settings?: EconomySettings
): Promise<boolean> {
  const economy = parseEconomyJson(profile.economyJson);
  if (economy.monetizationUnlockedAt) return true;
  const config = settings ?? (await loadEconomySettings(ctx));
  const fanCount = await getFanCount(ctx, profile.userId);
  return fanCount >= config.minFansForMonetization;
}

export async function ensureMonetizationUnlock(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  profile: Doc<"socialProfiles">
): Promise<{ unlocked: boolean; fanCount: number }> {
  const settings = await loadEconomySettings(ctx);
  const fanCount = await getFanCount(ctx, profile.userId);
  const economy = parseEconomyJson(profile.economyJson);

  if (fanCount >= settings.minFansForMonetization && !economy.monetizationUnlockedAt) {
    const next: EconomyJson = {
      ...economy,
      monetizationUnlockedAt: Date.now(),
    };
    await ctx.db.patch(profile._id, {
      economyJson: serializeEconomyJson(next),
      updatedAt: Date.now(),
    });
    return { unlocked: true, fanCount };
  }

  return { unlocked: Boolean(economy.monetizationUnlockedAt), fanCount };
}

function generateAffiliateCode(handle: string): string {
  const base = handle.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "GIGA"}${suffix}`;
}

async function getUserByEmail(ctx: DbCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
}

export async function deductVariableCredits(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  userId: string,
  amount: number,
  reference?: string,
  metadata?: string
) {
  const user = await getUserByEmail(ctx, userId);
  if (!user) throw new Error("User not found.");
  const cost = Math.max(1, Math.floor(amount));
  const balance = user.credits ?? 0;
  if (balance < cost) {
    throw new Error(`Insufficient credits (${cost} required, ${balance} available).`);
  }
  const balanceAfter = balance - cost;
  await ctx.db.patch(user._id, { credits: balanceAfter });
  await ctx.db.insert("creditLogs", {
    userId,
    action: "chat",
    amount: -cost,
    balanceAfter,
    reference,
    metadata,
    createdAt: Date.now(),
  });
  return { balanceAfter, charged: cost };
}

export const getEconomySettings = query({
  args: {},
  handler: async (ctx) => {
    return await loadEconomySettings(ctx);
  },
});

export const getCreatorDashboard = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;

    const settings = await loadEconomySettings(ctx);
    const fanCount = await getFanCount(ctx, userId);
    const supportingCount = await getSupportingCount(ctx, userId);
    const unlocked = await isMonetizationUnlocked(ctx, profile, settings);
    const gamification = parseGamification(profile.gamificationJson);

    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_author_created", (q) => q.eq("authorId", userId))
      .order("desc")
      .take(100);
    const activePosts = posts.filter((p) => !p.deletedAt);

    const totalViews = activePosts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);
    const totalLikes = activePosts.reduce((sum, p) => sum + p.likeCount, 0);
    const totalComments = activePosts.reduce((sum, p) => sum + p.commentCount, 0);
    const totalShares = activePosts.reduce((sum, p) => sum + p.shareCount, 0);

    const videoPosts = activePosts.filter(
      (p) => p.mediaType === "video" || p.postType === "video"
    );
    const videoViews = videoPosts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);
    const videoWatchMinutes = videoPosts.reduce(
      (sum, p) => sum + (p.videoDurationSec ?? 0) / 60,
      0
    );

    const gifts = await ctx.db
      .query("socialCreatorGifts")
      .withIndex("by_creator_created", (q) => q.eq("creatorId", userId))
      .order("desc")
      .take(200);
    const giftEarningsGhs = gifts.reduce((sum, g) => sum + g.amountGhs, 0);

    const affiliateEvents = await ctx.db
      .query("socialAffiliateEvents")
      .withIndex("by_creator_created", (q) => q.eq("creatorId", userId))
      .collect();
    const affiliateClicks = affiliateEvents.filter((e) => e.eventType === "click").length;
    const affiliateConversions = affiliateEvents.filter(
      (e) => e.eventType === "conversion"
    ).length;
    const affiliateEarningsGhs = affiliateEvents
      .filter((e) => e.eventType === "conversion")
      .reduce((sum, e) => sum + (e.amountGhs ?? 0), 0);

    const boosts = await ctx.db
      .query("socialPostBoosts")
      .withIndex("by_creator_created", (q) => q.eq("creatorId", userId))
      .order("desc")
      .take(50);
    const activeBoosts = boosts.filter(
      (b) => b.status === "active" && b.endsAt > Date.now()
    );
    const adSpendGhs = boosts.reduce((sum, b) => sum + b.budgetGhs, 0);
    const adImpressions = boosts.reduce((sum, b) => sum + b.impressions, 0);

    const contentEarningsGhs =
      totalViews * settings.viewRewardRateGhs +
      videoWatchMinutes * settings.watchTimeRewardRateGhsPerMin +
      (totalComments + totalShares) * settings.engagementRewardRateGhs;

    const estimatedEarningsGhs =
      contentEarningsGhs + giftEarningsGhs + affiliateEarningsGhs;

    const topPosts = [...activePosts]
      .sort(
        (a, b) =>
          b.likeCount +
          b.commentCount +
          b.shareCount +
          (b.viewCount ?? 0) -
          (a.likeCount + a.commentCount + a.shareCount + (a.viewCount ?? 0))
      )
      .slice(0, 5)
      .map((p) => ({
        postId: p._id,
        body: p.body.slice(0, 120),
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        shareCount: p.shareCount,
        viewCount: p.viewCount ?? 0,
        postType: p.postType,
        createdAt: p.createdAt,
      }));

    const economy = parseEconomyJson(profile.economyJson);

    return {
      unlocked,
      fanCount,
      supportingCount,
      fansRequired: settings.minFansForMonetization,
      fanProgress: Math.min(100, Math.round((fanCount / settings.minFansForMonetization) * 100)),
      level: gamification.level,
      xp: gamification.xp,
      badges: gamification.badges,
      estimatedEarningsGhs,
      contentEarningsGhs,
      giftEarningsGhs,
      affiliateEarningsGhs,
      adSpendGhs,
      adImpressions,
      postPerformance: {
        postCount: activePosts.length,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
      },
      videoPerformance: {
        videoCount: videoPosts.length,
        videoViews,
        videoWatchMinutes: Math.round(videoWatchMinutes),
      },
      audienceInsights: {
        fanCount,
        supportingCount,
        engagementRate:
          fanCount > 0
            ? Math.round(((totalLikes + totalComments + totalShares) / fanCount) * 100) / 100
            : 0,
      },
      topPosts,
      activeBoostCount: activeBoosts.length,
      affiliateCode: economy.affiliateCode,
      affiliateClicks,
      affiliateConversions,
      settings,
    };
  },
});

export const getGiftsHub = query({
  args: {
    sessionToken: v.optional(v.string()),
    creatorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let viewerId: string | null = null;
    if (args.sessionToken) {
      try {
        viewerId = await requireSession(args.sessionToken);
      } catch {
        viewerId = null;
      }
    }

    const creatorId = args.creatorId ?? viewerId;
    if (!creatorId) return null;

    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", creatorId))
      .first();
    if (!profile) return null;

    const settings = await loadEconomySettings(ctx);
    const unlocked = await isMonetizationUnlocked(ctx, profile, settings);
    const isOwner = viewerId === creatorId;

    const gifts = await ctx.db
      .query("socialCreatorGifts")
      .withIndex("by_creator_created", (q) => q.eq("creatorId", creatorId))
      .order("desc")
      .take(isOwner ? 100 : 20);

    const totalGifts = gifts.length;
    const totalEarningsGhs = gifts.reduce((sum, g) => sum + g.amountGhs, 0);

    return {
      creatorId,
      displayName: profile.displayName,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl,
      // Receiving tips/gifts is open for every creator; fan unlock is for payout tools.
      unlocked: true,
      monetizationUnlocked: unlocked,
      isOwner,
      totalGifts,
      totalEarningsGhs,
      recentGifts: gifts.map((g) => ({
        giftType: g.giftType,
        credits: g.credits,
        amountGhs: g.amountGhs,
        message: g.message,
        createdAt: g.createdAt,
        senderId: isOwner ? g.senderId : undefined,
      })),
      giftCatalog: [
        { id: "spark", label: "Spark", emoji: "✨", credits: 5 },
        { id: "fire", label: "Fire", emoji: "🔥", credits: 10 },
        { id: "crown", label: "Crown", emoji: "👑", credits: 25 },
        { id: "rocket", label: "Rocket", emoji: "🚀", credits: 50 },
        { id: "diamond", label: "Diamond", emoji: "💎", credits: 100 },
      ],
    };
  },
});

export const sendCreatorGift = mutation({
  args: {
    sessionToken: v.string(),
    creatorId: v.string(),
    giftType: v.string(),
    credits: v.number(),
    message: v.optional(v.string()),
    postId: v.optional(v.id("socialPosts")),
  },
  handler: async (ctx, args) => {
    const senderId = await requireSession(args.sessionToken);
    if (senderId === args.creatorId) throw new Error("You cannot gift yourself.");

    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.creatorId))
      .first();
    if (!profile) throw new Error("Creator not found.");

    // Tips are allowed for any creator with a social profile (hotfix #220 / SW v171).
    // The 500-fan monetization unlock gates affiliate/payout tools — not tips or ad boosts.
    const settings = await loadEconomySettings(ctx);

    const credits = Math.max(1, Math.min(500, Math.floor(args.credits)));
    const share = settings.giftCreatorSharePercent / 100;
    const amountGhs = credits * settings.creditsToGhsRate * share;

    await deductVariableCredits(
      ctx,
      senderId,
      credits,
      `gift:${args.creatorId}`,
      JSON.stringify({ giftType: args.giftType, credits })
    );

    await ctx.db.insert("socialCreatorGifts", {
      creatorId: args.creatorId,
      senderId,
      giftType: args.giftType.trim().slice(0, 32),
      credits,
      amountGhs,
      message: args.message?.trim().slice(0, 200),
      postId: args.postId,
      createdAt: Date.now(),
    });

    return { ok: true, amountGhs };
  },
});

export const getAffiliateDashboard = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;

    const settings = await loadEconomySettings(ctx);
    const unlocked = await isMonetizationUnlocked(ctx, profile, settings);
    const economy = parseEconomyJson(profile.economyJson);

    const events = await ctx.db
      .query("socialAffiliateEvents")
      .withIndex("by_creator_created", (q) => q.eq("creatorId", userId))
      .order("desc")
      .take(200);

    const clicks = events.filter((e) => e.eventType === "click").length;
    const conversions = events.filter((e) => e.eventType === "conversion").length;
    const earningsGhs = events
      .filter((e) => e.eventType === "conversion")
      .reduce((sum, e) => sum + (e.amountGhs ?? 0), 0);

    const affiliateLink = economy.affiliateCode
      ? `https://www.giga3ai.com/?ref=${economy.affiliateCode}`
      : null;

    return {
      unlocked,
      affiliateCode: economy.affiliateCode,
      affiliateLink,
      clicks,
      conversions,
      earningsGhs,
      commissionPercent: settings.affiliateCommissionPercent,
      recentEvents: events.slice(0, 20).map((e) => ({
        eventType: e.eventType,
        amountGhs: e.amountGhs,
        createdAt: e.createdAt,
      })),
    };
  },
});

export const ensureAffiliateCode = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found.");

    const unlocked = await isMonetizationUnlocked(ctx, profile);
    if (!unlocked) {
      throw new Error("Affiliate program unlocks at 500 Fans.");
    }

    const economy = parseEconomyJson(profile.economyJson);
    if (economy.affiliateCode) {
      return { affiliateCode: economy.affiliateCode };
    }

    const code = generateAffiliateCode(profile.handle);
    await ctx.db.patch(profile._id, {
      economyJson: serializeEconomyJson({ ...economy, affiliateCode: code }),
      updatedAt: Date.now(),
    });

    return { affiliateCode: code };
  },
});

export const trackAffiliateClick = mutation({
  args: {
    affiliateCode: v.string(),
    visitorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const code = args.affiliateCode.trim().slice(0, 32);
    if (!code) return { ok: false };

    const profiles = await ctx.db.query("socialProfiles").take(500);
    const profile = profiles.find((p) => parseEconomyJson(p.economyJson).affiliateCode === code);
    if (!profile) return { ok: false };

    await ctx.db.insert("socialAffiliateEvents", {
      creatorId: profile.userId,
      affiliateCode: code,
      eventType: "click",
      visitorId: args.visitorId?.slice(0, 64),
      createdAt: Date.now(),
    });

    return { ok: true, creatorId: profile.userId };
  },
});

export const createBoostCampaign = mutation({
  args: {
    sessionToken: v.string(),
    targetType: v.union(
      v.literal("post"),
      v.literal("video"),
      v.literal("marketplace"),
      v.literal("business")
    ),
    targetId: v.string(),
    budgetGhs: v.number(),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found.");

    const settings = await loadEconomySettings(ctx);
    // Advertisement boosts are open to every creator — fan unlock is for
    // affiliate / payout tools only (tips are also ungated).

    const budgetGhs = Math.max(
      settings.boostBudgetMinGhs,
      Math.min(settings.boostBudgetMaxGhs, Math.floor(args.budgetGhs))
    );
    if (!settings.boostDurationDays.includes(args.durationDays)) {
      throw new Error("Invalid campaign duration.");
    }

    if (args.targetType === "post" || args.targetType === "video") {
      const post = await ctx.db.get(args.targetId as Id<"socialPosts">);
      if (!post || post.deletedAt || post.authorId !== userId) {
        throw new Error("Post not found or not owned by you.");
      }
    }

    const now = Date.now();
    const endsAt = now + args.durationDays * 24 * 60 * 60 * 1000;

    const boostId = await ctx.db.insert("socialPostBoosts", {
      creatorId: userId,
      targetType: args.targetType,
      targetId: args.targetId,
      budgetGhs,
      durationDays: args.durationDays,
      status: "active",
      impressions: 0,
      reach: 0,
      engagement: 0,
      startedAt: now,
      endsAt,
      createdAt: now,
    });

    return { boostId, endsAt };
  },
});

export const listBoostCampaigns = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const boosts = await ctx.db
      .query("socialPostBoosts")
      .withIndex("by_creator_created", (q) => q.eq("creatorId", userId))
      .order("desc")
      .take(50);

    const now = Date.now();
    return {
      campaigns: boosts.map((b) => ({
        boostId: b._id,
        targetType: b.targetType,
        targetId: b.targetId,
        budgetGhs: b.budgetGhs,
        durationDays: b.durationDays,
        status: b.endsAt <= now && b.status === "active" ? "completed" : b.status,
        impressions: b.impressions,
        reach: b.reach,
        engagement: b.engagement,
        remainingDays: Math.max(0, Math.ceil((b.endsAt - now) / (24 * 60 * 60 * 1000))),
        startedAt: b.startedAt,
        endsAt: b.endsAt,
      })),
    };
  },
});

export const getProfileEconomySummary = query({
  args: {
    handle: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const handle = args.handle.trim().toLowerCase().replace(/^@/, "");
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
    if (!profile) return null;

    let viewerId: string | null = null;
    if (args.sessionToken) {
      try {
        viewerId = await requireSession(args.sessionToken);
      } catch {
        viewerId = null;
      }
    }

    const settings = await loadEconomySettings(ctx);
    const fanCount = await getFanCount(ctx, profile.userId);
    const supportingCount = await getSupportingCount(ctx, profile.userId);
    const unlocked = await isMonetizationUnlocked(ctx, profile, settings);
    const gamification = parseGamification(profile.gamificationJson);
    const privacy = parsePrivacySettings(profile.privacySettingsJson);

    let mutualFans = 0;
    let supporting = false;
    if (viewerId && viewerId !== profile.userId) {
      const pair = await ctx.db
        .query("socialFollows")
        .withIndex("by_pair", (q) =>
          q.eq("followerId", viewerId!).eq("followingId", profile.userId)
        )
        .first();
      supporting = Boolean(pair);
      mutualFans = await getMutualFanCount(ctx, viewerId, profile.userId);
    }

    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_author_created", (q) => q.eq("authorId", profile.userId))
      .order("desc")
      .take(100);
    const visiblePosts = posts.filter((p) => {
      if (p.deletedAt) return false;
      const isOwner = viewerId === profile.userId;
      if (p.visibility === "followers" && !isOwner && !supporting) return false;
      return true;
    });

    const totalViews = visiblePosts.reduce((sum, p) => sum + (p.viewCount ?? 0), 0);
    const likesReceived = visiblePosts.reduce((sum, p) => sum + p.likeCount, 0);

    return {
      fanCount,
      supportingCount,
      mutualFans,
      supporting,
      unlocked,
      level: gamification.level,
      badges: gamification.badges,
      postCount: visiblePosts.length,
      totalViews,
      likesReceived,
      coverUrl: profile.coverUrl,
      privacy,
      fansRequired: settings.minFansForMonetization,
    };
  },
});
