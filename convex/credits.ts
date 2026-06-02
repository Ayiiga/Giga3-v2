import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  CREDITS_PER_IMAGE,
  CREDITS_PER_VIDEO,
  FREE_DAILY_CHATS,
  FREE_DAILY_IMAGES,
  isPremium,
  todayKey,
} from "./creditsConfig";

async function getOrCreateUsage(
  ctx: { db: any },
  userId: string,
  dateKey: string
) {
  const existing = await ctx.db
    .query("usageDaily")
    .withIndex("by_user_date", (q: any) =>
      q.eq("userId", userId).eq("dateKey", dateKey)
    )
    .first();
  if (existing) return existing;
  const id = await ctx.db.insert("usageDaily", {
    userId,
    dateKey,
    chatsUsed: 0,
    imagesUsed: 0,
  });
  return await ctx.db.get(id);
}

export const getUsageSnapshot = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) return null;

    const dateKey = todayKey();
    const usage = await getOrCreateUsage(ctx, args.userId, dateKey);
    const tier = user.tier ?? (user.plan === "premium" ? "premium" : "free");
    const premium = isPremium(tier, user.subscriptionExpiresAt);

    return {
      tier,
      premium,
      credits: user.credits ?? 0,
      tokens: user.tokens ?? 0,
      dateKey,
      chatsUsed: usage?.chatsUsed ?? 0,
      chatsLimit: premium ? null : FREE_DAILY_CHATS,
      imagesUsed: usage?.imagesUsed ?? 0,
      imagesLimit: premium ? null : FREE_DAILY_IMAGES,
      canGenerateVideo: premium && (user.credits ?? 0) >= CREDITS_PER_VIDEO,
    };
  },
});

export const assertCanChat = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("User not found");

    const tier = user.tier ?? (user.plan === "premium" ? "premium" : "free");
    const premium = isPremium(tier, user.subscriptionExpiresAt);
    if (premium) return { allowed: true as const };

    const usage = await getOrCreateUsage(ctx, args.userId, todayKey());
    if ((usage?.chatsUsed ?? 0) >= FREE_DAILY_CHATS) {
      throw new Error(
        `Daily chat limit reached (${FREE_DAILY_CHATS}/day). Upgrade to Premium for unlimited chats.`
      );
    }
    await ctx.db.patch(usage!._id, { chatsUsed: (usage!.chatsUsed ?? 0) + 1 });
    return { allowed: true as const };
  },
});

export const assertCanGenerateImage = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("User not found");

    const tier = user.tier ?? (user.plan === "premium" ? "premium" : "free");
    const premium = isPremium(tier, user.subscriptionExpiresAt);

    if (!premium) {
      const usage = await getOrCreateUsage(ctx, args.userId, todayKey());
      if ((usage?.imagesUsed ?? 0) >= FREE_DAILY_IMAGES) {
        throw new Error(
          `Daily image limit reached (${FREE_DAILY_IMAGES}/day). Go Premium or wait until tomorrow.`
        );
      }
      await ctx.db.patch(usage!._id, {
        imagesUsed: (usage!.imagesUsed ?? 0) + 1,
      });
      return { chargedCredits: 0 };
    }

    if ((user.credits ?? 0) < CREDITS_PER_IMAGE) {
      throw new Error(
        `Not enough credits (${CREDITS_PER_IMAGE} required). Purchase credits to continue.`
      );
    }
    await ctx.db.patch(user._id, {
      credits: (user.credits ?? 0) - CREDITS_PER_IMAGE,
    });
    return { chargedCredits: CREDITS_PER_IMAGE };
  },
});

export const assertCanGenerateVideo = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("User not found");

    const tier = user.tier ?? (user.plan === "premium" ? "premium" : "free");
    const premium = isPremium(tier, user.subscriptionExpiresAt);
    if (!premium) {
      throw new Error("Video generation requires a Premium subscription.");
    }
    if ((user.credits ?? 0) < CREDITS_PER_VIDEO) {
      throw new Error(
        `Not enough credits (${CREDITS_PER_VIDEO} required for video).`
      );
    }
    await ctx.db.patch(user._id, {
      credits: (user.credits ?? 0) - CREDITS_PER_VIDEO,
    });
    return { chargedCredits: CREDITS_PER_VIDEO };
  },
});

export const grantCredits = mutation({
  args: { userId: v.string(), credits: v.number(), reference: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      credits: (user.credits ?? 0) + args.credits,
    });
    await ctx.db.insert("transactions", {
      userId: args.userId,
      amount: args.credits,
      reference: args.reference,
      tokens: 0,
    });
    return (user.credits ?? 0) + args.credits;
  },
});

export const activatePremium = mutation({
  args: {
    userId: v.string(),
    months: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();
    if (!user) throw new Error("User not found");

    const base = Math.max(user.subscriptionExpiresAt ?? Date.now(), Date.now());
    const expires = base + args.months * 30 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(user._id, {
      tier: "premium",
      plan: "premium",
      subscriptionExpiresAt: expires,
    });
    return expires;
  },
});
