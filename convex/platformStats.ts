import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";

const ONLINE_WINDOW_MS = 3 * 60 * 1000;

function ensureStatsAdminAccess(adminKey: string): void {
  const requiredKey =
    process.env.PLATFORM_STATS_ADMIN_KEY?.trim() ||
    process.env.QUALITY_DASHBOARD_ADMIN_KEY?.trim();
  if (!requiredKey || adminKey !== requiredKey) {
    throw new Error("Unauthorized");
  }
}

async function incrementCounter(
  ctx: { db: any },
  key: string,
  amount = 1
): Promise<void> {
  const row = await ctx.db
    .query("platformCounters")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  const now = Date.now();
  if (row) {
    await ctx.db.patch(row._id, {
      value: row.value + amount,
      updatedAt: now,
    });
    return;
  }
  await ctx.db.insert("platformCounters", { key, value: amount, updatedAt: now });
}

async function readCounter(ctx: { db: any }, key: string): Promise<number> {
  const row = await ctx.db
    .query("platformCounters")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return row?.value ?? 0;
}

export const incrementRegisteredUserInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    await incrementCounter(ctx, "registered_users");
  },
});

export const heartbeat = mutation({
  args: {
    clientId: v.string(),
    isPwa: v.boolean(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clientId = args.clientId.trim().slice(0, 120);
    if (!clientId) return { ok: true as const };

    let userId: string | undefined;
    if (args.sessionToken?.trim()) {
      try {
        userId = await requireSession(args.sessionToken);
      } catch {
        userId = undefined;
      }
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("presenceSessions")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId,
        isPwa: args.isPwa,
        lastSeenAt: now,
      });
    } else {
      await ctx.db.insert("presenceSessions", {
        clientId,
        userId,
        isPwa: args.isPwa,
        lastSeenAt: now,
      });
      await incrementCounter(ctx, "site_visits");
    }

    return { ok: true as const };
  },
});

export const recordPwaInstall = mutation({
  args: {
    clientId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clientId = args.clientId.trim().slice(0, 120);
    if (!clientId) return { ok: true as const };

    const flagKey = `pwa_install_${clientId}`;
    const already = await readCounter(ctx, flagKey);
    if (already > 0) return { ok: true as const };

    await incrementCounter(ctx, flagKey, 1);
    await incrementCounter(ctx, "pwa_installs");

    let userId: string | undefined;
    if (args.sessionToken?.trim()) {
      try {
        userId = await requireSession(args.sessionToken);
      } catch {
        userId = undefined;
      }
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("presenceSessions")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { userId, isPwa: true, lastSeenAt: now });
    } else {
      await ctx.db.insert("presenceSessions", {
        clientId,
        userId,
        isPwa: true,
        lastSeenAt: now,
      });
    }

    return { ok: true as const };
  },
});

export const incrementUserCount = mutation({
  args: {},
  handler: async (ctx) => {
    await incrementCounter(ctx, "registered_users");
  },
});

export const getDashboard = query({
  args: { adminKey: v.string() },
  handler: async (ctx, args) => {
    try {
      ensureStatsAdminAccess(args.adminKey);
    } catch {
      return null;
    }

    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    const onlineCutoff = now - ONLINE_WINDOW_MS;

    const presence = await ctx.db.query("presenceSessions").collect();
    const activePresence = presence.filter((row) => row.lastSeenAt >= onlineCutoff);
    const onlineUsers = new Set(
      activePresence.map((row) => row.userId).filter(Boolean)
    ).size;
    const onlinePwa = activePresence.filter((row) => row.isPwa).length;

    const pwaInstalls = await readCounter(ctx, "pwa_installs");
    const siteVisits = await readCounter(ctx, "site_visits");

    return {
      totalRegisteredUsers: users.length,
      pwaInstalls,
      siteVisits,
      onlineNow: activePresence.length,
      onlineRegisteredUsers: onlineUsers,
      onlinePwaSessions: onlinePwa,
      asOf: now,
      onlineWindowMinutes: ONLINE_WINDOW_MS / 60_000,
    };
  },
});
