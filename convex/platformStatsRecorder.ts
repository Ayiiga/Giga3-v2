import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { todayKey } from "./creditsConfig";

type DailyPatch = Partial<{
  messages: number;
  conversations: number;
  aiRequests: number;
  aiFailures: number;
  newUsers: number;
  totalLatencyMs: number;
  latencySamples: number;
  peakConcurrent: number;
}>;

async function bumpDaily(
  ctx: { db: any },
  patch: DailyPatch
): Promise<void> {
  const dateKey = todayKey();
  const now = Date.now();
  const row = await ctx.db
    .query("platformStatsDaily")
    .withIndex("by_dateKey", (q: any) => q.eq("dateKey", dateKey))
    .first();

  if (!row) {
    await ctx.db.insert("platformStatsDaily", {
      dateKey,
      messages: patch.messages ?? 0,
      conversations: patch.conversations ?? 0,
      aiRequests: patch.aiRequests ?? 0,
      aiFailures: patch.aiFailures ?? 0,
      newUsers: patch.newUsers ?? 0,
      totalLatencyMs: patch.totalLatencyMs ?? 0,
      latencySamples: patch.latencySamples ?? 0,
      peakConcurrent: patch.peakConcurrent ?? 0,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.patch(row._id, {
    messages: row.messages + (patch.messages ?? 0),
    conversations: row.conversations + (patch.conversations ?? 0),
    aiRequests: row.aiRequests + (patch.aiRequests ?? 0),
    aiFailures: row.aiFailures + (patch.aiFailures ?? 0),
    newUsers: row.newUsers + (patch.newUsers ?? 0),
    totalLatencyMs: row.totalLatencyMs + (patch.totalLatencyMs ?? 0),
    latencySamples: row.latencySamples + (patch.latencySamples ?? 0),
    peakConcurrent: Math.max(row.peakConcurrent, patch.peakConcurrent ?? 0),
    updatedAt: now,
  });
}

export const recordMessageInternal = internalMutation({
  args: { role: v.union(v.literal("user"), v.literal("assistant")) },
  handler: async (ctx) => {
    await bumpDaily(ctx, { messages: 1 });
  },
});

export const recordConversationCreatedInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    await bumpDaily(ctx, { conversations: 1 });
  },
});

export const recordAiRequestInternal = internalMutation({
  args: {
    latencyMs: v.optional(v.number()),
    failed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await bumpDaily(ctx, {
      aiRequests: 1,
      aiFailures: args.failed ? 1 : 0,
      totalLatencyMs: args.latencyMs ?? 0,
      latencySamples: args.latencyMs != null ? 1 : 0,
    });
  },
});

export const recordNewUserInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    await bumpDaily(ctx, { newUsers: 1 });
  },
});

export const recordUserActivityInternal = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const dateKey = todayKey();
    const now = Date.now();
    const existing = await ctx.db
      .query("userActivityDaily")
      .withIndex("by_date_user", (q) =>
        q.eq("dateKey", dateKey).eq("userId", args.userId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeenAt: now });
      return;
    }
    await ctx.db.insert("userActivityDaily", {
      userId: args.userId,
      dateKey,
      lastSeenAt: now,
    });
  },
});

export const updatePeakConcurrentInternal = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    await bumpDaily(ctx, { peakConcurrent: args.count });
  },
});
