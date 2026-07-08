import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { toClientPaymentView, type ClientPaymentView } from "./paymentViews";
import {
  CREDIT_COSTS,
  isSubscriptionActive,
} from "./creditsConfig";
import { FREE_STARTER_CREDITS, type SubscriptionPlanId } from "./subscriptionPlans";
import { parseGamification } from "./gigaSocialViews";

type DbCtx = { db: any };

async function getUserByEmail(ctx: DbCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
}

function isVideoSubscriptionActive(
  plan?: string | null,
  expiresAt?: number | null
): boolean {
  if (!plan || plan === "free") return false;
  if (!expiresAt) return false;
  return expiresAt > Date.now();
}

function readDailyFreeCredits(): number {
  const raw = process.env.DAILY_FREE_CREDITS;
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function creditLogDescription(action: string, amount: number): string {
  const labels: Record<string, string> = {
    chat: "Chat message",
    writing: "Writing mode",
    research: "Research mode",
    image: "Image generation",
    video: "Video generation",
    subscription_refill: "Subscription refill",
    credit_purchase: "Credit pack purchase",
    starter_grant: "Starter credits",
    admin_grant: "Admin credit grant",
    refund: "Credit refund",
  };
  const base = labels[action] ?? action.replace(/_/g, " ");
  if (amount < 0) return `${base} (deducted)`;
  if (amount > 0) return `${base} (granted)`;
  return base;
}

function videoCreditLogDescription(action: string): string {
  const labels: Record<string, string> = {
    video_generation: "Video AI generation",
    video_generation_refund: "Video credit refund",
    video_subscription_refill: "Video subscription refill",
    video_credit_purchase: "Video credit purchase",
    starter_grant: "Video starter credits",
  };
  return labels[action] ?? action.replace(/_/g, " ");
}

function paymentDescription(payment: ClientPaymentView): string {
  switch (payment.type) {
    case "subscription":
      return `Subscription — ${payment.planId ?? "plan"}`;
    case "credits":
      return `Credit pack — ${payment.creditsGranted ?? 0} credits`;
    case "video_subscription":
      return `Video subscription — ${payment.videoPlanId ?? "plan"}`;
    case "video_credits":
      return `Video credits — ${payment.videoCreditsGranted ?? 0}`;
    case "marketplace":
      return "Marketplace purchase";
    default:
      return payment.productId;
  }
}

export type WalletTransactionView = {
  id: string;
  createdAt: number;
  category: "chat_credits" | "video_credits" | "payment";
  type: string;
  amount: number;
  amountUnit: "credits" | "ghs" | "video_credits";
  status: "completed" | "pending" | "failed";
  description: string;
  referenceId?: string;
  balanceAfter?: number;
};

export const getDashboard = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const user = await getUserByEmail(ctx, userId);
    if (!user) return null;

    const plan = (user.subscriptionPlan ?? "free") as SubscriptionPlanId;
    const subscriptionActive = isSubscriptionActive(
      plan,
      user.subscriptionExpiresAt
    );

    const activeSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_status", (q: any) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .first();

    const creatorProfile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    const socialProfile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    const gamification = socialProfile
      ? parseGamification(socialProfile.gamificationJson)
      : null;

    let pendingPayoutGhs = 0;
    if (creatorProfile) {
      const pendingPayouts = await ctx.db
        .query("creatorPayouts")
        .withIndex("by_creator", (q: any) => q.eq("creatorId", userId))
        .collect();
      pendingPayoutGhs = pendingPayouts
        .filter((row: { status: string }) => row.status === "pending")
        .reduce((sum: number, row: { amountGhs: number }) => sum + row.amountGhs, 0);
    }

    const recentSales = creatorProfile
      ? await ctx.db
          .query("marketplacePurchases")
          .withIndex("by_creator", (q: any) => q.eq("creatorId", userId))
          .order("desc")
          .take(5)
      : [];

    return {
      balances: {
        chatCredits: user.credits ?? 0,
        videoCredits: user.videoCredits ?? 0,
        rewardPoints: gamification?.xp ?? 0,
        rewardLevel: gamification?.level ?? 1,
        creatorEarningsGhs: creatorProfile?.payoutBalanceGhs ?? 0,
        creatorPendingPayoutGhs: pendingPayoutGhs,
      },
      subscription: {
        planId: subscriptionActive ? plan : ("free" as const),
        active: subscriptionActive,
        expiresAt: user.subscriptionExpiresAt ?? null,
        recordPlanId: activeSubscription?.planId ?? null,
        starterCredits: FREE_STARTER_CREDITS,
        dailyFreeCredits: readDailyFreeCredits(),
      },
      videoSubscription: {
        planId: user.videoSubscriptionPlan ?? null,
        active: isVideoSubscriptionActive(
          user.videoSubscriptionPlan,
          user.videoSubscriptionExpiresAt
        ),
        expiresAt: user.videoSubscriptionExpiresAt ?? null,
      },
      creditCosts: CREDIT_COSTS,
      creator: creatorProfile
        ? {
            verified: creatorProfile.verified,
            verificationStatus:
              creatorProfile.verificationStatus ?? ("none" as const),
            recentSalesCount: recentSales.length,
            withdrawalsEnabled: false,
          }
        : null,
      paymentProvider: "paystack" as const,
    };
  },
});

export const listMyPayments = query({
  args: { ...sessionArgs, limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const cap = Math.min(Math.max(args.limit ?? 40, 1), 100);
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(cap);
    return rows.map(toClientPaymentView);
  },
});

export const listVideoCreditLogs = query({
  args: { ...sessionArgs, limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const cap = Math.min(Math.max(args.limit ?? 40, 1), 100);
    return await ctx.db
      .query("videoCreditLogs")
      .withIndex("by_user_created", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(cap);
  },
});

export const listWalletTransactions = query({
  args: { ...sessionArgs, limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const cap = Math.min(Math.max(args.limit ?? 50, 1), 120);
    const perSource = Math.ceil(cap / 3);

    const [creditLogs, videoLogs, payments] = await Promise.all([
      ctx.db
        .query("creditLogs")
        .withIndex("by_user_created", (q: any) => q.eq("userId", userId))
        .order("desc")
        .take(perSource),
      ctx.db
        .query("videoCreditLogs")
        .withIndex("by_user_created", (q: any) => q.eq("userId", userId))
        .order("desc")
        .take(perSource),
      ctx.db
        .query("payments")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .order("desc")
        .take(perSource),
    ]);

    const merged: WalletTransactionView[] = [];

    for (const row of creditLogs) {
      merged.push({
        id: `credit:${row._id}`,
        createdAt: row.createdAt,
        category: "chat_credits",
        type: row.action,
        amount: row.amount,
        amountUnit: "credits",
        status: "completed",
        description: creditLogDescription(row.action, row.amount),
        referenceId: row.reference,
        balanceAfter: row.balanceAfter,
      });
    }

    for (const row of videoLogs) {
      merged.push({
        id: `video:${row._id}`,
        createdAt: row.createdAt,
        category: "video_credits",
        type: row.action,
        amount: row.amount,
        amountUnit: "video_credits",
        status: "completed",
        description: videoCreditLogDescription(row.action),
        referenceId: row.reference,
        balanceAfter: row.balanceAfter,
      });
    }

    for (const row of payments) {
      const view = toClientPaymentView(row);
      merged.push({
        id: `payment:${row.reference}`,
        createdAt: view.createdAt,
        category: "payment",
        type: view.type,
        amount: view.amountGhs,
        amountUnit: "ghs",
        status:
          view.status === "success"
            ? "completed"
            : view.status === "pending"
              ? "pending"
              : "failed",
        description: paymentDescription(view),
        referenceId: view.reference,
      });
    }

    merged.sort((a, b) => b.createdAt - a.createdAt);
    return merged.slice(0, cap);
  },
});
