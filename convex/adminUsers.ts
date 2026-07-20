import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { isPlatformAdminEmail } from "./platformAdmin";

const ONLINE_WINDOW_MS = 3 * 60 * 1000;

function subscriptionActive(user: {
  subscriptionPlan?: string;
  subscriptionExpiresAt?: number;
}): boolean {
  const plan = user.subscriptionPlan ?? "free";
  if (plan === "free") return false;
  if (!user.subscriptionExpiresAt) return plan !== "free";
  return user.subscriptionExpiresAt > Date.now();
}

export const getPlatformOverview = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    try {
      await ensureAdminAccess(args);
    } catch {
      return null;
    }

    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    const onlineCutoff = now - ONLINE_WINDOW_MS;
    const presence = await ctx.db.query("presenceSessions").collect();
    const activePresence = presence.filter((row) => row.lastSeenAt >= onlineCutoff);
    const activeUserIds = new Set(
      activePresence.map((row) => row.userId).filter(Boolean)
    );

    const verified = users.filter((u) => Boolean(u.emailVerificationTime)).length;
    const premium = users.filter((u) => subscriptionActive(u)).length;
    const suspended = users.filter((u) => u.accountStatus === "suspended").length;
    const newSignups = 0;

    const socialPosts = await ctx.db.query("socialPosts").collect();
    let liveSessions = 0;
    try {
      const liveStreams = await ctx.db.query("socialLiveStreams").collect();
      liveSessions = liveStreams.length;
    } catch {
      liveSessions = 0;
    }

    return {
      totalUsers: users.length,
      activeUsers: activeUserIds.size,
      verifiedUsers: verified,
      premiumSubscribers: premium,
      freeUsers: users.length - premium,
      newSignups24h: newSignups,
      suspendedUsers: suspended,
      gigaSocialPosts: socialPosts.length,
      liveSessions,
    };
  },
});

export const listUsersAdmin = query({
  args: {
    ...adminCredentialArgs,
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      await ensureAdminAccess(args);
    } catch {
      return null;
    }

    const needle = args.search?.trim().toLowerCase() ?? "";
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    let users = await ctx.db.query("users").collect();

    if (needle) {
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(needle) ||
          (u.name?.toLowerCase().includes(needle) ?? false)
      );
    }

    users.sort((a, b) => a.email.localeCompare(b.email));

    const presence = await ctx.db.query("presenceSessions").collect();
    const onlineCutoff = Date.now() - ONLINE_WINDOW_MS;
    const lastSeenByUser = new Map<string, number>();
    for (const row of presence) {
      if (!row.userId) continue;
      const prev = lastSeenByUser.get(row.userId) ?? 0;
      if (row.lastSeenAt > prev) lastSeenByUser.set(row.userId, row.lastSeenAt);
    }

    return users.slice(0, limit).map((u) => ({
      id: u._id,
      email: u.email,
      name: u.name ?? null,
      plan: u.subscriptionPlan ?? u.plan ?? "free",
      credits: u.credits ?? 0,
      verified: Boolean(u.emailVerificationTime),
      subscriptionActive: subscriptionActive(u),
      subscriptionExpiresAt: u.subscriptionExpiresAt ?? null,
      accountStatus: u.accountStatus ?? "active",
      userRole: u.userRole ?? null,
      lastSeenAt: lastSeenByUser.get(u.email) ?? null,
    }));
  },
});

export const setUserAccountStatus = mutation({
  args: {
    ...adminCredentialArgs,
    userId: v.id("users"),
    accountStatus: v.union(v.literal("active"), v.literal("suspended")),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (isPlatformAdminEmail(user.email) && args.accountStatus === "suspended") {
      throw new Error("Cannot suspend a platform administrator");
    }
    await ctx.db.patch(args.userId, { accountStatus: args.accountStatus });
    return { ok: true as const };
  },
});
