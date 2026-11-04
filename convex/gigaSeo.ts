import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

const DEFAULT_SETTINGS = {
  key: "primary",
  enabled: false,
  articlesPerWeek: 3,
  publishingPermission: "automatic_after_quality_checks" as const,
  targetMarket: "ghana_international" as const,
  contentPriorities: [
    "AI tools and tutorials",
    "Ghana education and examination preparation",
    "STEM, robotics and digital skills",
    "Teacher development and professional learning",
    "African technology and innovation",
  ],
};

export const getAdminOverview = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const settings = await ctx.db
      .query("gigaSeoSettings")
      .withIndex("by_key", (q) => q.eq("key", "primary"))
      .unique();
    const [
      keywordCount,
      newKeywordCount,
      contentPlanCount,
      draftCount,
      scheduledCount,
      publishedCount,
    ] = await Promise.all([
      ctx.db.query("gigaSeoKeywordIdeas").count(),
      ctx.db
        .query("gigaSeoKeywordIdeas")
        .withIndex("by_status_created", (q) => q.eq("status", "new"))
        .count(),
      ctx.db.query("gigaSeoContentPlans").count(),
      ctx.db
        .query("gigaSeoContentPlans")
        .withIndex("by_status_updated", (q) => q.eq("status", "draft"))
        .count(),
      ctx.db
        .query("gigaSeoContentPlans")
        .withIndex("by_status_updated", (q) => q.eq("status", "scheduled"))
        .count(),
      ctx.db
        .query("gigaSeoContentPlans")
        .withIndex("by_status_updated", (q) => q.eq("status", "published"))
        .count(),
    ]);
    return {
      settings: settings ?? DEFAULT_SETTINGS,
      keywordCount,
      newKeywordCount,
      contentPlanCount,
      draftCount,
      scheduledCount,
      publishedCount,
    };
  },
});

export const updateSettings = mutation({
  args: {
    ...adminCredentialArgs,
    enabled: v.boolean(),
    articlesPerWeek: v.number(),
    publishingPermission: v.union(
      v.literal("human_approval"),
      v.literal("automatic_after_quality_checks")
    ),
    targetMarket: v.union(
      v.literal("ghana_only"),
      v.literal("ghana_international"),
      v.literal("africa_international")
    ),
    contentPriorities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!Number.isInteger(args.articlesPerWeek) || args.articlesPerWeek < 1 || args.articlesPerWeek > 7) {
      throw new Error("Publishing frequency must be between 1 and 7 articles per week.");
    }
    if (args.contentPriorities.length < 1 || args.contentPriorities.length > 10) {
      throw new Error("Choose between 1 and 10 content priorities.");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("gigaSeoSettings")
      .withIndex("by_key", (q) => q.eq("key", "primary"))
      .unique();
    const value = {
      key: "primary",
      enabled: args.enabled,
      articlesPerWeek: args.articlesPerWeek,
      publishingPermission: args.publishingPermission,
      targetMarket: args.targetMarket,
      contentPriorities: args.contentPriorities,
      updatedBy: "platform_admin",
      updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("gigaSeoSettings", value);
    return { ok: true as const, updatedAt: now };
  },
});
