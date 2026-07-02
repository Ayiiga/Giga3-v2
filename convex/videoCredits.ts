import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { videoCreditActionValidator } from "./schema";
import { FREE_VIDEO_STARTER_CREDITS } from "./videoCreditsConfig";
import { listVideoCatalog } from "./videoPlans";

type DbCtx = { db: any };

async function getUserByEmail(ctx: DbCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
}

async function logVideoCredit(
  ctx: DbCtx,
  args: {
    userId: string;
    action: string;
    amount: number;
    balanceAfter: number;
    category?: string;
    reference?: string;
    metadata?: string;
  }
) {
  await ctx.db.insert("videoCreditLogs", {
    userId: args.userId,
    action: args.action as any,
    amount: args.amount,
    balanceAfter: args.balanceAfter,
    category: args.category,
    reference: args.reference,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

function isVideoSubscriptionActive(
  plan?: string | null,
  expiresAt?: number | null
): boolean {
  if (!plan || plan === "free") return false;
  if (!expiresAt) return false;
  return expiresAt > Date.now();
}

export const grantVideoStarterCreditsInternal = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserByEmail(ctx, args.userId);
    if (!user) return { granted: false };
    if ((user.videoCredits ?? 0) > 0) return { granted: false };
    const balanceAfter = FREE_VIDEO_STARTER_CREDITS;
    await ctx.db.patch(user._id, { videoCredits: balanceAfter });
    await logVideoCredit(ctx, {
      userId: args.userId,
      action: "starter_grant",
      amount: balanceAfter,
      balanceAfter,
      metadata: "video_starter",
    });
    return { granted: true, balanceAfter };
  },
});

export const refundVideoCreditsInternal = internalMutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) return { refunded: false as const };

    if (args.reference) {
      const priorRefund = await ctx.db
        .query("videoCreditLogs")
        .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
        .collect();
      const alreadyRefunded = priorRefund.some(
        (row) =>
          row.action === "video_generation_refund" &&
          row.reference === args.reference
      );
      if (alreadyRefunded) {
        return { refunded: false as const, reason: "already_refunded" as const };
      }
    }

    const user = await getUserByEmail(ctx, args.userId);
    if (!user) throw new Error("User not found");
    const balance = user.videoCredits ?? 0;
    const balanceAfter = balance + args.amount;
    await ctx.db.patch(user._id, { videoCredits: balanceAfter });
    await logVideoCredit(ctx, {
      userId: args.userId,
      action: "video_generation_refund",
      amount: args.amount,
      balanceAfter,
      category: args.category,
      reference: args.reference,
    });
    return { refunded: true as const, balanceAfter };
  },
});

export const deductVideoCreditsInternal = internalMutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByEmail(ctx, args.userId);
    if (!user) throw new Error("User not found");
    const balance = user.videoCredits ?? 0;
    if (balance < args.amount) {
      throw new Error(
        `Insufficient video credits (${args.amount} required, ${balance} available). Buy a Video AI pack at /video/plans.`
      );
    }
    const balanceAfter = balance - args.amount;
    await ctx.db.patch(user._id, { videoCredits: balanceAfter });
    await logVideoCredit(ctx, {
      userId: args.userId,
      action: "video_generation",
      amount: -args.amount,
      balanceAfter,
      category: args.category,
      reference: args.reference,
    });
    return { balanceAfter };
  },
});

export const getVideoWallet = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const user = await getUserByEmail(ctx, email);
    if (!user) {
      return {
        videoCredits: 0,
        videoSubscriptionActive: false,
        videoSubscriptionPlan: null,
        videoSubscriptionExpiresAt: null,
        catalog: listVideoCatalog(),
      };
    }
    return {
      videoCredits: user.videoCredits ?? 0,
      videoSubscriptionActive: isVideoSubscriptionActive(
        user.videoSubscriptionPlan,
        user.videoSubscriptionExpiresAt
      ),
      videoSubscriptionPlan: user.videoSubscriptionPlan ?? null,
      videoSubscriptionExpiresAt: user.videoSubscriptionExpiresAt ?? null,
      catalog: listVideoCatalog(),
    };
  },
});
