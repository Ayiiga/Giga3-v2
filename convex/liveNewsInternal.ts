import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  formatLiveNewsBriefing,
  LIVE_NEWS_CATEGORIES,
  type LiveNewsHeadline,
} from "./liveNewsShared";
import { isLiveNewsEnabled } from "./featureFlags";

export const upsertCategoryCache = internalMutation({
  args: {
    category: v.string(),
    itemsJson: v.string(),
    fetchedAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("liveNewsCache")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        itemsJson: args.itemsJson,
        fetchedAt: args.fetchedAt,
        expiresAt: args.expiresAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("liveNewsCache", args);
  },
});

export const readCategoryCache = internalQuery({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("liveNewsCache")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .first();
  },
});

/** Compact briefing for chat system prompts (current-events answers with citations). */
export const getBriefingInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    if (!isLiveNewsEnabled()) return null;

    const now = Date.now();
    const rows: Array<{ category: string; items: LiveNewsHeadline[] }> = [];

    for (const cat of LIVE_NEWS_CATEGORIES) {
      const cached = await ctx.db
        .query("liveNewsCache")
        .withIndex("by_category", (q) => q.eq("category", cat.id))
        .first();
      if (!cached || cached.expiresAt <= now) continue;
      const items = JSON.parse(cached.itemsJson) as LiveNewsHeadline[];
      if (items.length > 0) {
        rows.push({ category: cat.label, items });
      }
    }

    if (rows.length === 0) return null;
    return formatLiveNewsBriefing(rows);
  },
});
