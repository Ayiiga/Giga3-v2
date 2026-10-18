import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { parseGamification } from "./gigaSocialViews";
import type { Doc, Id } from "./_generated/dataModel";

/** Paystack tip tiers in GHS (MoMo / card / bank). */
export const CREATOR_TIP_CATALOG = [
  { id: "spark", label: "Spark", emoji: "✨", amountGhs: 1 },
  { id: "fire", label: "Fire", emoji: "🔥", amountGhs: 2 },
  { id: "crown", label: "Crown", emoji: "👑", amountGhs: 5 },
  { id: "rocket", label: "Rocket", emoji: "🚀", amountGhs: 10 },
  { id: "diamond", label: "Diamond", emoji: "💎", amountGhs: 20 },
] as const;

export function getCreatorTipTier(giftType: string) {
  return CREATOR_TIP_CATALOG.find((tier) => tier.id === giftType) ?? null;
}

type DbCtx = { db: import("./_generated/server").QueryCtx["db"] };

/** Fans required to accept monetisation terms and start earning. */
export const MIN_FANS_FOR_MONETIZATION = 5;
/** Fans required to request a withdrawal (balance/payment checks still apply). */
export const MIN_FANS_FOR_WITHDRAWAL = 20;
/** Must match web/lib/gigasocial/creatorMonetizationPolicy.ts */
export const CREATOR_MONETIZATION_POLICY_VERSION = "giga-creator-monetisation-v1";

export type EconomySettings = {
  minFansForMonetization: number;
  minFansForWithdrawal: number;
  minWithdrawalGhs: number;
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
  minFansForMonetization: MIN_FANS_FOR_MONETIZATION,
  minFansForWithdrawal: MIN_FANS_FOR_WITHDRAWAL,
  minWithdrawalGhs: 50,
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
  minFansForWithdrawal: "gigasocial.economy.minFansWithdrawal",
  minWithdrawalGhs: "gigasocial.economy.minWithdrawalGhs",
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
  /** Legacy unlock timestamp — treated as acceptance for older accounts. */
  monetizationUnlockedAt?: number;
  monetizationAcceptedAt?: number;
  monetizationPolicyVersion?: string;
  monetizationAcceptedBy?: string;
  unlockNotified?: boolean;
  unlockEligibleNotifiedAt?: number;
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
  let sawWithdrawalKey = false;
  let sawMinWithdrawalKey = false;

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
    if (!Number.isFinite(num)) continue;
    if (field === "minFansForWithdrawal") sawWithdrawalKey = true;
    if (field === "minWithdrawalGhs") sawMinWithdrawalKey = true;
    (settings as Record<string, number>)[field] = num;
  }

  // Legacy remote config stored 500 as a combined affiliate/payout gate.
  // Migrate in-memory to the split 5-fan monetisation / 20-fan withdrawal model.
  if (settings.minFansForMonetization >= 100) {
    settings.minFansForMonetization = MIN_FANS_FOR_MONETIZATION;
  }
  if (!sawWithdrawalKey) {
    settings.minFansForWithdrawal = MIN_FANS_FOR_WITHDRAWAL;
  }
  if (!sawMinWithdrawalKey) {
    settings.minWithdrawalGhs = DEFAULT_ECONOMY_SETTINGS.minWithdrawalGhs;
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

function hasAcceptedMonetization(economy: EconomyJson): boolean {
  return Boolean(economy.monetizationAcceptedAt || economy.monetizationUnlockedAt);
}

/** True only after server-recorded policy acceptance (or legacy unlock). Fan count alone is not enough. */
export async function isMonetizationUnlocked(
  ctx: DbCtx,
  profile: Doc<"socialProfiles">,
  _settings?: EconomySettings
): Promise<boolean> {
  const economy = parseEconomyJson(profile.economyJson);
  return hasAcceptedMonetization(economy);
}

export async function getMonetizationEligibility(
  ctx: DbCtx,
  profile: Doc<"socialProfiles">,
  settings?: EconomySettings
): Promise<{
  fanCount: number;
  fansRequired: number;
  withdrawalFansRequired: number;
  fanEligible: boolean;
  withdrawalFanEligible: boolean;
  accepted: boolean;
  unlocked: boolean;
  policyVersion: string;
  showEligibleInvite: boolean;
}> {
  const config = settings ?? (await loadEconomySettings(ctx));
  const fanCount = await getFanCount(ctx, profile.userId);
  const economy = parseEconomyJson(profile.economyJson);
  const accepted = hasAcceptedMonetization(economy);
  const fanEligible = fanCount >= config.minFansForMonetization;
  return {
    fanCount,
    fansRequired: config.minFansForMonetization,
    withdrawalFansRequired: config.minFansForWithdrawal,
    fanEligible,
    withdrawalFanEligible: fanCount >= config.minFansForWithdrawal,
    accepted,
    unlocked: accepted,
    policyVersion: CREATOR_MONETIZATION_POLICY_VERSION,
    showEligibleInvite: fanEligible && !accepted && !economy.unlockEligibleNotifiedAt,
  };
}

/**
 * Marks that the creator has been notified they are eligible (5 fans).
 * Does NOT activate earning — acceptance is required via acceptMonetizationTerms.
 */
export async function ensureMonetizationUnlock(
  ctx: { db: import("./_generated/server").MutationCtx["db"] },
  profile: Doc<"socialProfiles">
): Promise<{ unlocked: boolean; fanCount: number; eligible: boolean }> {
  const settings = await loadEconomySettings(ctx);
  const eligibility = await getMonetizationEligibility(ctx, profile, settings);
  const economy = parseEconomyJson(profile.economyJson);

  if (eligibility.fanEligible && !eligibility.accepted && !economy.unlockEligibleNotifiedAt) {
    await ctx.db.patch(profile._id, {
      economyJson: serializeEconomyJson({
        ...economy,
        unlockEligibleNotifiedAt: Date.now(),
        unlockNotified: true,
      }),
      updatedAt: Date.now(),
    });
  }

  return {
    unlocked: eligibility.unlocked,
    fanCount: eligibility.fanCount,
    eligible: eligibility.fanEligible,
  };
}

export async function assertWithdrawalEligibility(
  ctx: DbCtx,
  profile: Doc<"socialProfiles">,
  settings?: EconomySettings
): Promise<{ fanCount: number; settings: EconomySettings }> {
  const config = settings ?? (await loadEconomySettings(ctx));
  const eligibility = await getMonetizationEligibility(ctx, profile, config);
  if (!eligibility.accepted) {
    throw new Error("Accept the creator monetisation rules before requesting a withdrawal.");
  }
  if (!eligibility.withdrawalFanEligible) {
    throw new Error(
      `Withdrawals unlock at ${config.minFansForWithdrawal} fans. You have ${eligibility.fanCount}.`
    );
  }
  return { fanCount: eligibility.fanCount, settings: config };
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
    const supportingCount = await getSupportingCount(ctx, userId);
    const eligibility = await getMonetizationEligibility(ctx, profile, settings);
    const { fanCount, unlocked } = eligibility;
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

    const creatorProfile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const payoutBalanceGhs = creatorProfile?.payoutBalanceGhs ?? 0;
    const pendingPayouts = await ctx.db
      .query("creatorPayouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .take(20);

    return {
      unlocked,
      fanCount,
      supportingCount,
      fansRequired: settings.minFansForMonetization,
      withdrawalFansRequired: settings.minFansForWithdrawal,
      minWithdrawalGhs: settings.minWithdrawalGhs,
      fanEligible: eligibility.fanEligible,
      withdrawalFanEligible: eligibility.withdrawalFanEligible,
      monetizationAccepted: eligibility.accepted,
      policyVersion: eligibility.policyVersion,
      showEligibleInvite: eligibility.fanEligible && !eligibility.accepted,
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
      payoutBalanceGhs,
      recentPayouts: pendingPayouts.map((p) => ({
        payoutId: p._id,
        amountGhs: p.amountGhs,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
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
      affiliateOpenToEveryone: true,
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
      giftCatalog: CREATOR_TIP_CATALOG.map((tier) => ({
        id: tier.id,
        label: tier.label,
        emoji: tier.emoji,
        amountGhs: tier.amountGhs,
        credits: tier.amountGhs, // legacy field — tips are GHS via Paystack
      })),
    };
  },
});

/** Record a tip after successful Paystack charge (idempotent by payment reference). */
export const fulfillCreatorGiftInternal = internalMutation({
  args: {
    reference: v.string(),
    senderId: v.string(),
    creatorId: v.string(),
    giftType: v.string(),
    amountGhs: v.number(),
    postId: v.optional(v.id("socialPosts")),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("socialCreatorGifts")
      .withIndex("by_payment_reference", (q) => q.eq("paymentReference", args.reference))
      .first();
    if (existing) return { giftId: existing._id, alreadyFulfilled: true as const };

    const settings = await loadEconomySettings(ctx);
    const share = settings.giftCreatorSharePercent / 100;
    const creatorAmountGhs = Math.round(args.amountGhs * share * 100) / 100;

    const giftId = await ctx.db.insert("socialCreatorGifts", {
      creatorId: args.creatorId,
      senderId: args.senderId,
      giftType: args.giftType.trim().slice(0, 32),
      credits: 0,
      amountGhs: creatorAmountGhs,
      message: args.message?.trim().slice(0, 200),
      postId: args.postId,
      paymentReference: args.reference,
      createdAt: Date.now(),
    });
    return { giftId, alreadyFulfilled: false as const, creatorAmountGhs };
  },
});

/** Activate a boost after successful Paystack charge (idempotent by payment reference). */
export const activateBoostCampaignInternal = internalMutation({
  args: {
    reference: v.string(),
    creatorId: v.string(),
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
    const existing = await ctx.db
      .query("socialPostBoosts")
      .withIndex("by_payment_reference", (q) => q.eq("paymentReference", args.reference))
      .first();
    if (existing) return { boostId: existing._id, alreadyFulfilled: true as const };

    const now = Date.now();
    const endsAt = now + args.durationDays * 24 * 60 * 60 * 1000;
    const boostId = await ctx.db.insert("socialPostBoosts", {
      creatorId: args.creatorId,
      targetType: args.targetType,
      targetId: args.targetId,
      budgetGhs: args.budgetGhs,
      durationDays: args.durationDays,
      status: "active",
      impressions: 0,
      reach: 0,
      engagement: 0,
      startedAt: now,
      endsAt,
      paymentReference: args.reference,
      createdAt: now,
    });
    return { boostId, alreadyFulfilled: false as const, endsAt };
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
    // Monetisation acceptance + fan thresholds gate earning/withdrawals — not tips or ad boosts.
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
    const economy = parseEconomyJson(profile.economyJson);
    const fanCount = await getFanCount(ctx, userId);

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
      // Affiliate programme is open to everyone — no fan minimum.
      unlocked: true,
      openToEveryone: true,
      fanCount,
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
    const userId = await requireSession(args.sessionToken, ctx);
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found.");

    // No fan-count gate — anyone with a profile can join the affiliate programme.
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
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const code = args.affiliateCode.trim().slice(0, 32);
    if (!code) return { ok: false };

    const profiles = await ctx.db.query("socialProfiles").take(500);
    const profile = profiles.find((p) => parseEconomyJson(p.economyJson).affiliateCode === code);
    if (!profile) return { ok: false };

    // Reject self-referrals when the visitor is authenticated as the affiliate.
    if (args.sessionToken) {
      try {
        const visitorId = await requireSession(args.sessionToken, ctx);
        if (visitorId === profile.userId) {
          return { ok: false, reason: "self_referral" as const };
        }
      } catch {
        /* anonymous click ok */
      }
    }

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

/** Server-side acceptance of creator monetisation rules (required before earning activation). */
export const acceptMonetizationTerms = mutation({
  args: {
    sessionToken: v.string(),
    policyVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found.");

    if (args.policyVersion !== CREATOR_MONETIZATION_POLICY_VERSION) {
      throw new Error("Outdated policy version. Refresh and accept the latest rules.");
    }

    const settings = await loadEconomySettings(ctx);
    const fanCount = await getFanCount(ctx, userId);
    if (fanCount < settings.minFansForMonetization) {
      throw new Error(
        `Creator monetisation unlocks at ${settings.minFansForMonetization} fans. You have ${fanCount}.`
      );
    }

    const economy = parseEconomyJson(profile.economyJson);
    if (hasAcceptedMonetization(economy)) {
      return {
        ok: true as const,
        alreadyAccepted: true as const,
        acceptedAt: economy.monetizationAcceptedAt ?? economy.monetizationUnlockedAt!,
        policyVersion: economy.monetizationPolicyVersion ?? CREATOR_MONETIZATION_POLICY_VERSION,
        fanCount,
      };
    }

    const now = Date.now();
    await ctx.db.patch(profile._id, {
      economyJson: serializeEconomyJson({
        ...economy,
        monetizationAcceptedAt: now,
        monetizationUnlockedAt: now,
        monetizationPolicyVersion: CREATOR_MONETIZATION_POLICY_VERSION,
        monetizationAcceptedBy: userId,
        unlockEligibleNotifiedAt: economy.unlockEligibleNotifiedAt ?? now,
        unlockNotified: true,
      }),
      updatedAt: now,
    });

    return {
      ok: true as const,
      alreadyAccepted: false as const,
      acceptedAt: now,
      policyVersion: CREATOR_MONETIZATION_POLICY_VERSION,
      fanCount,
    };
  },
});

/** Request a GigaSocial/creator payout — fans, acceptance, balance, and min amount checked server-side. */
export const requestCreatorWithdrawal = mutation({
  args: {
    sessionToken: v.string(),
    amountGhs: v.number(),
    method: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("GigaSocial profile required.");

    const { settings } = await assertWithdrawalEligibility(ctx, profile);

    const creatorProfile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!creatorProfile) throw new Error("Creator payout profile required.");

    const amount = Math.round(args.amountGhs);
    if (amount < settings.minWithdrawalGhs) {
      throw new Error(`Minimum withdrawal is GHS ${settings.minWithdrawalGhs}.`);
    }
    if (amount > creatorProfile.payoutBalanceGhs) {
      throw new Error("Insufficient withdrawable balance.");
    }
    if (amount <= 0) throw new Error("Invalid withdrawal amount.");

    // Prevent concurrent duplicate pending requests for the same amount within a short window.
    const recent = await ctx.db
      .query("creatorPayouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .take(5);
    const now = Date.now();
    const duplicate = recent.find(
      (p) =>
        p.status === "pending" &&
        p.amountGhs === amount &&
        now - p.createdAt < 60_000
    );
    if (duplicate) {
      throw new Error("A matching withdrawal request is already pending.");
    }

    await ctx.db.patch(creatorProfile._id, {
      payoutBalanceGhs: creatorProfile.payoutBalanceGhs - amount,
      updatedAt: now,
    });

    const payoutId = await ctx.db.insert("creatorPayouts", {
      creatorId: userId,
      amountGhs: amount,
      status: "pending",
      method: args.method?.slice(0, 80),
      note: args.note?.slice(0, 300) || "gigasocial_creator_withdrawal",
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true as const, payoutId, status: "pending" as const, amountGhs: amount };
  },
});

/** Validate boost checkout inputs for Paystack initialize (action-safe). */
export const validateBoostCheckoutInternal = internalQuery({
  args: {
    creatorId: v.string(),
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
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.creatorId))
      .first();
    if (!profile) throw new Error("Profile not found.");

    const settings = await loadEconomySettings(ctx);
    const budgetGhs = Math.max(
      settings.boostBudgetMinGhs,
      Math.min(settings.boostBudgetMaxGhs, Math.floor(args.budgetGhs))
    );
    if (!settings.boostDurationDays.includes(args.durationDays)) {
      throw new Error("Invalid campaign duration.");
    }

    if (args.targetType === "post" || args.targetType === "video") {
      const post = await ctx.db.get(args.targetId as Id<"socialPosts">);
      if (!post || post.deletedAt || post.authorId !== args.creatorId) {
        throw new Error("Post not found or not owned by you.");
      }
    }

    return {
      budgetGhs,
      durationDays: args.durationDays,
      targetType: args.targetType,
      targetId: args.targetId,
      label: `Boost ${args.targetType} · GHC ${budgetGhs}`,
    };
  },
});

/**
 * Free/unpaid boost creation is disabled — campaigns require Paystack
 * (mobile money, cards, etc.) via paystack.initializeBoostPayment.
 */
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
  handler: async () => {
    throw new Error(
      "Boost campaigns are paid with Paystack (mobile money, card, or bank). Use Pay & launch."
    );
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
