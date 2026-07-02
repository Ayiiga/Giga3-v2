import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import type { AiProviderTier, ChatProviderId, RequestKind } from "./providerRouter";
import { todayKey } from "./creditsConfig";

export const recordAiUsageInternal = internalMutation({
  args: {
    userId: v.string(),
    providerId: v.string(),
    requestKind: v.string(),
    mode: v.string(),
    tier: v.string(),
    latencyMs: v.number(),
    usedFallback: v.boolean(),
    cached: v.boolean(),
    usedWebSearch: v.optional(v.boolean()),
    estimatedTokens: v.optional(v.number()),
    conversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dateKey = todayKey();

    await ctx.db.insert("aiUsageEvents", {
      userId: args.userId,
      providerId: args.providerId,
      requestKind: args.requestKind,
      mode: args.mode,
      tier: args.tier,
      latencyMs: args.latencyMs,
      usedFallback: args.usedFallback,
      cached: args.cached,
      usedWebSearch: args.usedWebSearch ?? false,
      estimatedTokens: args.estimatedTokens,
      conversationId: args.conversationId,
      dateKey,
      createdAt: now,
    });

    const daily = await ctx.db
      .query("aiUsageDaily")
      .withIndex("by_dateKey_provider", (q) =>
        q.eq("dateKey", dateKey).eq("providerId", args.providerId)
      )
      .first();

    if (!daily) {
      await ctx.db.insert("aiUsageDaily", {
        dateKey,
        providerId: args.providerId,
        requestCount: 1,
        fallbackCount: args.usedFallback ? 1 : 0,
        cacheHitCount: args.cached ? 1 : 0,
        totalLatencyMs: args.latencyMs,
        updatedAt: now,
      });
      return;
    }

    await ctx.db.patch(daily._id, {
      requestCount: daily.requestCount + 1,
      fallbackCount: daily.fallbackCount + (args.usedFallback ? 1 : 0),
      cacheHitCount: daily.cacheHitCount + (args.cached ? 1 : 0),
      totalLatencyMs: daily.totalLatencyMs + args.latencyMs,
      updatedAt: now,
    });
  },
});

export const getUserHasPurchasedCredits = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { requireSession } = await import("./auth");
    const email = await requireSession(args.sessionToken, ctx);
    const log = await ctx.db
      .query("creditLogs")
      .withIndex("by_user_created", (q) => q.eq("userId", email))
      .order("desc")
      .take(50);
    return log.some((row) => row.action === "credit_purchase");
  },
});

/** Observability: per-provider AI usage totals for a day (defaults to today). */
export const getDailyProviderUsageInternal = internalQuery({
  args: { dateKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const dateKey = args.dateKey ?? todayKey();
    const rows = await ctx.db
      .query("aiUsageDaily")
      .withIndex("by_dateKey_provider", (q) => q.eq("dateKey", dateKey))
      .collect();
    return rows.map((row) => ({
      providerId: row.providerId,
      requestCount: row.requestCount,
      fallbackCount: row.fallbackCount,
      cacheHitCount: row.cacheHitCount,
      avgLatencyMs:
        row.requestCount > 0
          ? Math.round(row.totalLatencyMs / row.requestCount)
          : 0,
    }));
  },
});

export type AiUsageRecordInput = {
  userId: string;
  providerId: ChatProviderId;
  requestKind: RequestKind;
  mode: string;
  tier: AiProviderTier;
  latencyMs: number;
  usedFallback: boolean;
  cached: boolean;
  usedWebSearch?: boolean;
  estimatedTokens?: number;
  conversationId?: string;
};
