import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

const DEFAULT_CONFIG: Record<string, { value: string; description: string }> = {
  "onboarding.enabled": { value: "true", description: "Show smart onboarding for new users" },
  "referrals.enabled": { value: "true", description: "Referral program active" },
  "dashboard.v2": { value: "true", description: "Intelligent home dashboard" },
  "search.global": { value: "true", description: "Unified global search" },
  "feedback.screenshots": { value: "true", description: "Allow screenshot attachments" },
  "growth.leaderboard": { value: "false", description: "Community leaderboard (beta)" },
};

function hashToPercent(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 100;
  }
  return hash;
}

export const getRemoteConfig = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("remoteConfigEntries").take(100);
    const map: Record<string, { enabled: boolean; value: string }> = {};

    for (const [key, def] of Object.entries(DEFAULT_CONFIG)) {
      const row = rows.find((r) => r.key === key);
      const enabled = row?.enabled ?? true;
      const rollout = row?.rolloutPercent ?? 100;
      const inRollout =
        !args.userId || rollout >= 100 || hashToPercent(args.userId + key) < rollout;
      map[key] = {
        enabled: enabled && inRollout,
        value: row?.value ?? def.value,
      };
    }

    for (const row of rows) {
      if (map[row.key]) continue;
      const inRollout =
        !args.userId || row.rolloutPercent >= 100 || hashToPercent(args.userId + row.key) < row.rolloutPercent;
      map[row.key] = { enabled: row.enabled && inRollout, value: row.value };
    }

    return map;
  },
});

export const upsertRemoteConfig = internalMutation({
  args: {
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
    enabled: v.boolean(),
    rolloutPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("remoteConfigEntries")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        description: args.description,
        enabled: args.enabled,
        rolloutPercent: args.rolloutPercent,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("remoteConfigEntries", {
      key: args.key,
      value: args.value,
      description: args.description,
      enabled: args.enabled,
      rolloutPercent: args.rolloutPercent,
      updatedAt: now,
    });
  },
});

export const listRemoteConfigAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    ensureAdminAccess(args);
    return await ctx.db.query("remoteConfigEntries").take(100);
  },
});
