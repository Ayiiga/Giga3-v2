import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";

function normalizeHandle(handle: string): string {
  return handle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export const getMyProfile = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    return await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
  },
});

export const getByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const handle = normalizeHandle(args.handle);
    if (!handle) return null;
    return await ctx.db
      .query("creatorProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
  },
});

export const upsertProfile = mutation({
  args: {
    sessionToken: v.string(),
    displayName: v.string(),
    handle: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const handle = normalizeHandle(args.handle);
    if (!handle || handle.length < 3) {
      throw new Error("Handle must be at least 3 characters.");
    }
    const displayName = args.displayName.trim().slice(0, 80);
    if (!displayName) throw new Error("Display name is required.");

    const taken = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
    const existing = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();

    if (taken && taken.userId !== email) {
      throw new Error("Handle is already taken.");
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName,
        handle,
        bio: args.bio?.trim().slice(0, 500),
        avatarUrl: args.avatarUrl,
        website: args.website?.trim().slice(0, 200),
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("creatorProfiles", {
      userId: email,
      displayName,
      handle,
      bio: args.bio?.trim().slice(0, 500),
      avatarUrl: args.avatarUrl,
      website: args.website?.trim().slice(0, 200),
      verified: false,
      totalSales: 0,
      totalEarningsGhs: 0,
      payoutBalanceGhs: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const requestVerification = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) throw new Error("Create a creator profile first.");
    if (profile.totalSales >= 3) {
      await ctx.db.patch(profile._id, { verified: true, updatedAt: Date.now() });
      return { verified: true };
    }
    return {
      verified: profile.verified,
      message:
        "Verification unlocks after 3 marketplace sales or manual review. Complete your profile and publish quality listings.",
    };
  },
});
