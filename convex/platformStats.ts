import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { todayKey } from "./creditsConfig";
import { internal } from "./_generated/api";

const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const MS_PER_DAY = 86_400_000;

function ensureStatsAdminAccess(adminKey: string): void {
  const requiredKey =
    process.env.PLATFORM_STATS_ADMIN_KEY?.trim() ||
    process.env.QUALITY_DASHBOARD_ADMIN_KEY?.trim();
  if (!requiredKey || adminKey !== requiredKey) {
    throw new Error("Unauthorized");
  }
}

function parseClientHints(userAgent: string | undefined): {
  deviceType: string;
  browser: string;
  os: string;
} {
  const ua = (userAgent ?? "").toLowerCase();
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipod/.test(ua)) deviceType = "mobile";
  else if (/ipad|tablet/.test(ua)) deviceType = "tablet";

  let browser = "other";
  if (ua.includes("edg/")) browser = "edge";
  else if (ua.includes("chrome/") && !ua.includes("chromium")) browser = "chrome";
  else if (ua.includes("firefox/")) browser = "firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "safari";
  else if (ua.includes("samsungbrowser")) browser = "samsung";

  let os = "other";
  if (ua.includes("android")) os = "android";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("mac os")) {
    os = ua.includes("iphone") || ua.includes("ipad") ? "ios" : "macos";
  } else if (ua.includes("windows")) os = "windows";
  else if (ua.includes("linux")) os = "linux";

  return { deviceType, browser, os };
}

function dateKeysBack(days: number): string[] {
  const keys: string[] = [];
  const base = new Date();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(base.getTime() - i * MS_PER_DAY);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
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

function tallyBreakdown(
  rows: { deviceType?: string; browser?: string; os?: string; country?: string }[]
) {
  const count = (field: "deviceType" | "browser" | "os" | "country") => {
    const map: Record<string, number> = {};
    for (const row of rows) {
      const key = row[field] ?? "unknown";
      map[key] = (map[key] ?? 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };
  return {
    devices: count("deviceType"),
    browsers: count("browser"),
    operatingSystems: count("os"),
    countries: count("country"),
  };
}

export const incrementRegisteredUserInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    await incrementCounter(ctx, "registered_users");
    await ctx.runMutation(internal.platformStatsRecorder.recordNewUserInternal, {});
  },
});

export const heartbeat = mutation({
  args: {
    clientId: v.string(),
    isPwa: v.boolean(),
    sessionToken: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    country: v.optional(v.string()),
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

    const hints = parseClientHints(args.userAgent);
    const country = args.country?.trim().slice(0, 64) || undefined;
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
        deviceType: hints.deviceType,
        browser: hints.browser,
        os: hints.os,
        country,
      });
    } else {
      await ctx.db.insert("presenceSessions", {
        clientId,
        userId,
        isPwa: args.isPwa,
        lastSeenAt: now,
        deviceType: hints.deviceType,
        browser: hints.browser,
        os: hints.os,
        country,
      });
      await incrementCounter(ctx, "site_visits");
    }

    if (userId) {
      await ctx.runMutation(internal.platformStatsRecorder.recordUserActivityInternal, {
        userId,
      });
    }

    const onlineCutoff = now - ONLINE_WINDOW_MS;
    const presence = await ctx.db.query("presenceSessions").collect();
    const onlineCount = presence.filter((row) => row.lastSeenAt >= onlineCutoff).length;
    await ctx.runMutation(internal.platformStatsRecorder.updatePeakConcurrentInternal, {
      count: onlineCount,
    });

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
    const today = todayKey();

    const presence = await ctx.db.query("presenceSessions").collect();
    const activePresence = presence.filter((row) => row.lastSeenAt >= onlineCutoff);
    const onlineRegistered = new Set(
      activePresence.map((row) => row.userId).filter(Boolean)
    ).size;
    const onlinePwa = activePresence.filter((row) => row.isPwa).length;

    const pwaInstalls = await readCounter(ctx, "pwa_installs");
    const siteVisits = await readCounter(ctx, "site_visits");

    const todayStats = await ctx.db
      .query("platformStatsDaily")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", today))
      .first();

    const last14Keys = dateKeysBack(14).reverse();
    const dailyRows = await Promise.all(
      last14Keys.map((dateKey) =>
        ctx.db
          .query("platformStatsDaily")
          .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
          .first()
      )
    );
    const dailyTrend = last14Keys.map((dateKey, i) => {
      const row = dailyRows[i];
      return {
        dateKey,
        messages: row?.messages ?? 0,
        conversations: row?.conversations ?? 0,
        aiRequests: row?.aiRequests ?? 0,
        activeUsers: 0,
      };
    });

    const activityToday = await ctx.db
      .query("userActivityDaily")
      .withIndex("by_date_user", (q) => q.eq("dateKey", today))
      .collect();
    const dau = activityToday.length;

    const wauKeys = new Set(dateKeysBack(7));
    const mauKeys = new Set(dateKeysBack(30));
    const allActivity = await ctx.db.query("userActivityDaily").collect();
    const wau = new Set(
      allActivity.filter((row) => wauKeys.has(row.dateKey)).map((row) => row.userId)
    ).size;
    const mau = new Set(
      allActivity.filter((row) => mauKeys.has(row.dateKey)).map((row) => row.userId)
    ).size;

    const returningToday = activityToday.filter((row) =>
      allActivity.some(
        (prev) => prev.userId === row.userId && prev.dateKey < today
      )
    ).length;

    const aiUsageToday = await ctx.db
      .query("aiUsageDaily")
      .withIndex("by_dateKey_provider", (q) => q.eq("dateKey", today))
      .collect();

    const aiModelUsage = aiUsageToday.map((row) => ({
      provider: row.providerId,
      requests: row.requestCount,
      avgLatencyMs:
        row.requestCount > 0
          ? Math.round(row.totalLatencyMs / row.requestCount)
          : 0,
      fallbacks: row.fallbackCount,
    }));

    const aiEventsToday = await ctx.db
      .query("aiUsageEvents")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", today))
      .collect();
    const tokenUsage = aiEventsToday.reduce(
      (sum, row) => sum + (row.estimatedTokens ?? 0),
      0
    );
    const estimatedAiCostUsd = Number((tokenUsage * 0.000002).toFixed(4));

    const avgResponseTimeMs =
      todayStats && todayStats.latencySamples > 0
        ? Math.round(todayStats.totalLatencyMs / todayStats.latencySamples)
        : 0;
    const aiRequestsToday = todayStats?.aiRequests ?? 0;
    const failedRequestsToday = todayStats?.aiFailures ?? 0;
    const errorRate =
      aiRequestsToday > 0
        ? Number(((failedRequestsToday / aiRequestsToday) * 100).toFixed(1))
        : 0;

    const breakdown = tallyBreakdown(activePresence);

    const installConversionRate =
      siteVisits > 0
        ? Number(((pwaInstalls / siteVisits) * 100).toFixed(1))
        : 0;

    return {
      totalRegisteredUsers: users.length,
      pwaInstalls,
      siteVisits,
      onlineNow: activePresence.length,
      onlineRegisteredUsers: onlineRegistered,
      onlinePwaSessions: onlinePwa,
      dau,
      wau,
      mau,
      newUsersToday: todayStats?.newUsers ?? 0,
      conversationsToday: todayStats?.conversations ?? 0,
      messagesToday: todayStats?.messages ?? 0,
      aiRequestsToday,
      avgResponseTimeMs,
      failedRequestsToday,
      errorRate,
      peakConcurrentUsers: todayStats?.peakConcurrent ?? 0,
      returningUsersToday: returningToday,
      retention: {
        day1: dau > 0 ? Number(((returningToday / dau) * 100).toFixed(1)) : 0,
        day7: wau > 0 ? Number(((returningToday / wau) * 100).toFixed(1)) : 0,
        day30: mau > 0 ? Number(((returningToday / mau) * 100).toFixed(1)) : 0,
      },
      aiModelUsage,
      tokenUsage,
      estimatedAiCostUsd,
      installConversionRate,
      sessionDurationMinutes: 0,
      breakdown,
      dailyTrend,
      asOf: now,
      onlineWindowMinutes: ONLINE_WINDOW_MS / 60_000,
    };
  },
});
