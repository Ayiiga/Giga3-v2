import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { ChatProviderId } from "./providerRouter";

const CACHE_TTL_MS = 5 * 60 * 1000;

export const readCachedResponseInternal = internalQuery({
  args: { promptHash: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("aiResponseCache")
      .withIndex("by_promptHash", (q) => q.eq("promptHash", args.promptHash))
      .first();
    if (!row) return null;
    if (row.expiresAt <= Date.now()) {
      return null;
    }
    return {
      content: row.content,
      providerId: row.providerId as ChatProviderId,
    };
  },
});

export const writeCachedResponseInternal = internalMutation({
  args: {
    promptHash: v.string(),
    content: v.string(),
    providerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiResponseCache")
      .withIndex("by_promptHash", (q) => q.eq("promptHash", args.promptHash))
      .first();
    const expiresAt = Date.now() + CACHE_TTL_MS;
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        providerId: args.providerId,
        expiresAt,
      });
      return;
    }
    await ctx.db.insert("aiResponseCache", {
      promptHash: args.promptHash,
      content: args.content,
      providerId: args.providerId,
      expiresAt,
      createdAt: Date.now(),
    });
  },
});
