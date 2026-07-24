import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import {
  PHASE4_FLAG_DEFAULTS,
  PHASE4_FLAG_KEYS,
  type Phase4FlagKey,
} from "./phase4Controls";
import {
  PHASE5_FLAG_DEFAULTS,
  PHASE5_FLAG_KEYS,
  type Phase5FlagKey,
} from "./phase5Controls";
import {
  PHASE6_FLAG_DEFAULTS,
  PHASE6_FLAG_KEYS,
  type Phase6FlagKey,
} from "./phase6Controls";

const DEFAULT_CONFIG: Record<
  string,
  { value: string; description: string; enabled?: boolean }
> = {
  "onboarding.enabled": { value: "true", description: "Show smart onboarding for new users" },
  "referrals.enabled": { value: "true", description: "Referral program active" },
  "dashboard.v2": { value: "true", description: "Intelligent home dashboard" },
  "search.global": { value: "true", description: "Unified global search" },
  "feedback.screenshots": { value: "true", description: "Allow screenshot attachments" },
  "growth.leaderboard": {
    value: "false",
    description: "Community leaderboard (beta)",
    enabled: false,
  },
  "gigasocial.economy.minFans": {
    value: "500",
    description: "Minimum fans to unlock earn tools (affiliate, boost, payouts) — tips stay open",
  },
  "gigasocial.economy.viewRewardRate": { value: "0.001", description: "GHS per content view" },
  "gigasocial.economy.watchTimeRate": { value: "0.01", description: "GHS per video watch minute" },
  "gigasocial.economy.engagementRate": { value: "0.05", description: "GHS per comment or share" },
  "gigasocial.economy.giftSharePercent": { value: "80", description: "Creator share of gift value (%)" },
  "gigasocial.economy.affiliatePercent": { value: "10", description: "Affiliate commission (%)" },
  "gigasocial.economy.creditsToGhs": { value: "0.1", description: "GHS value per credit for gifts" },
  "gigasocial.economy.boostMinGhs": { value: "10", description: "Minimum boost budget (GHS)" },
  "gigasocial.economy.boostMaxGhs": { value: "2000", description: "Maximum boost budget (GHS)" },
  "gigasocial.economy.boostDurations": { value: "1,3,5,7,14,21,30,60,90", description: "Allowed boost durations (days)" },
  ...Object.fromEntries(
    Object.entries(PHASE4_FLAG_DEFAULTS).map(([key, def]) => [
      key,
      { value: def.value, description: def.description, enabled: def.enabled },
    ])
  ),
  ...Object.fromEntries(
    Object.entries(PHASE5_FLAG_DEFAULTS).map(([key, def]) => [
      key,
      { value: def.value, description: def.description, enabled: def.enabled },
    ])
  ),
  ...Object.fromEntries(
    Object.entries(PHASE6_FLAG_DEFAULTS).map(([key, def]) => [
      key,
      { value: def.value, description: def.description, enabled: def.enabled },
    ])
  ),
};

export const ECONOMY_CONFIG_PREFIX = "gigasocial.economy.";

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
    const rows = await ctx.db.query("remoteConfigEntries").take(200);
    const map: Record<string, { enabled: boolean; value: string }> = {};

    for (const [key, def] of Object.entries(DEFAULT_CONFIG)) {
      const row = rows.find((r) => r.key === key);
      // Phase 5/6 (and any entry with explicit default) may default OFF when unset.
      const enabled = row?.enabled ?? def.enabled ?? true;
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
    await ensureAdminAccess(args);
    return await ctx.db.query("remoteConfigEntries").take(100);
  },
});

export const getEconomyConfigAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const rows = await ctx.db.query("remoteConfigEntries").take(200);
    return Object.entries(DEFAULT_CONFIG)
      .filter(([key]) => key.startsWith(ECONOMY_CONFIG_PREFIX))
      .map(([key, def]) => {
        const row = rows.find((r) => r.key === key);
        return {
          key,
          value: row?.value ?? def.value,
          description: def.description,
        };
      });
  },
});

export const updateEconomyConfigAdmin = mutation({
  args: {
    ...adminCredentialArgs,
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!args.key.startsWith(ECONOMY_CONFIG_PREFIX)) {
      throw new Error("Invalid economy config key.");
    }
    const def = DEFAULT_CONFIG[args.key];
    if (!def) throw new Error("Unknown economy config key.");

    const existing = await ctx.db
      .query("remoteConfigEntries")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    const now = Date.now();
    const payload = {
      value: args.value.trim(),
      description: def.description,
      enabled: true,
      rolloutPercent: 100,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("remoteConfigEntries", { key: args.key, ...payload });
    }
    return { ok: true };
  },
});

/** Admin: list Phase 4 controlled-upgrade flags (defaults when unset). */
export const getPhase4ConfigAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const rows = await ctx.db.query("remoteConfigEntries").take(200);
    return PHASE4_FLAG_KEYS.map((key) => {
      const def = PHASE4_FLAG_DEFAULTS[key];
      const row = rows.find((r) => r.key === key);
      return {
        key,
        value: row?.value ?? def.value,
        description: def.description,
        enabled: row?.enabled ?? def.enabled,
        rolloutPercent: row?.rolloutPercent ?? 100,
      };
    });
  },
});

/** Admin: enable/disable a Phase 4 release-group flag (no schema change). */
export const updatePhase4ConfigAdmin = mutation({
  args: {
    ...adminCredentialArgs,
    key: v.string(),
    enabled: v.boolean(),
    value: v.optional(v.string()),
    rolloutPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!PHASE4_FLAG_KEYS.includes(args.key as Phase4FlagKey)) {
      throw new Error("Invalid Phase 4 config key.");
    }
    const key = args.key as Phase4FlagKey;
    const def = PHASE4_FLAG_DEFAULTS[key];
    const existing = await ctx.db
      .query("remoteConfigEntries")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const now = Date.now();
    const payload = {
      value: (args.value?.trim() || existing?.value || def.value).slice(0, 80),
      description: def.description,
      enabled: args.enabled,
      rolloutPercent: Math.max(
        0,
        Math.min(100, args.rolloutPercent ?? existing?.rolloutPercent ?? 100)
      ),
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("remoteConfigEntries", { key, ...payload });
    }
    return { ok: true, key, enabled: payload.enabled };
  },
});

/** Admin: list Phase 5 public-beta flags (defaults OFF when unset). */
export const getPhase5ConfigAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const rows = await ctx.db.query("remoteConfigEntries").take(120);
    return PHASE5_FLAG_KEYS.map((key) => {
      const def = PHASE5_FLAG_DEFAULTS[key];
      const row = rows.find((r) => r.key === key);
      return {
        key,
        value: row?.value ?? def.value,
        description: def.description,
        enabled: row?.enabled ?? def.enabled,
        rolloutPercent: row?.rolloutPercent ?? 0,
      };
    });
  },
});

/** Admin: enable/disable a Phase 5 module flag (no schema change). */
export const updatePhase5ConfigAdmin = mutation({
  args: {
    ...adminCredentialArgs,
    key: v.string(),
    enabled: v.boolean(),
    value: v.optional(v.string()),
    rolloutPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!PHASE5_FLAG_KEYS.includes(args.key as Phase5FlagKey)) {
      throw new Error("Invalid Phase 5 config key.");
    }
    const key = args.key as Phase5FlagKey;
    const def = PHASE5_FLAG_DEFAULTS[key];
    const existing = await ctx.db
      .query("remoteConfigEntries")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const now = Date.now();
    const payload = {
      value: (args.value?.trim() || existing?.value || def.value).slice(0, 80),
      description: def.description,
      enabled: args.enabled,
      rolloutPercent: Math.max(
        0,
        Math.min(100, args.rolloutPercent ?? existing?.rolloutPercent ?? 0)
      ),
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("remoteConfigEntries", { key, ...payload });
    }
    return { ok: true, key, enabled: payload.enabled };
  },
});

/** Admin: list Phase 6 Africa-launch flags (defaults OFF when unset). */
export const getPhase6ConfigAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const rows = await ctx.db.query("remoteConfigEntries").take(200);
    return PHASE6_FLAG_KEYS.map((key) => {
      const def = PHASE6_FLAG_DEFAULTS[key];
      const row = rows.find((r) => r.key === key);
      return {
        key,
        value: row?.value ?? def.value,
        description: def.description,
        enabled: row?.enabled ?? def.enabled,
        rolloutPercent: row?.rolloutPercent ?? 0,
      };
    });
  },
});

/** Admin: enable/disable a Phase 6 module flag (no schema change). */
export const updatePhase6ConfigAdmin = mutation({
  args: {
    ...adminCredentialArgs,
    key: v.string(),
    enabled: v.boolean(),
    value: v.optional(v.string()),
    rolloutPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!PHASE6_FLAG_KEYS.includes(args.key as Phase6FlagKey)) {
      throw new Error("Invalid Phase 6 config key.");
    }
    const key = args.key as Phase6FlagKey;
    const def = PHASE6_FLAG_DEFAULTS[key];
    const existing = await ctx.db
      .query("remoteConfigEntries")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    const now = Date.now();
    const payload = {
      value: (args.value?.trim() || existing?.value || def.value).slice(0, 80),
      description: def.description,
      enabled: args.enabled,
      rolloutPercent: Math.max(
        0,
        Math.min(100, args.rolloutPercent ?? existing?.rolloutPercent ?? 0)
      ),
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("remoteConfigEntries", { key, ...payload });
    }
    return { ok: true, key, enabled: payload.enabled };
  },
});
