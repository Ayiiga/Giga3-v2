import { query } from "./_generated/server";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { isPhase5FlagEnabled } from "./phase5Controls";

function dateKeyOffset(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Admin-only product analytics (DAU/WAU/MAU + content signals).
 * Gated by phase5.product_analytics — never exposed to end users.
 */
export const getProductAnalyticsAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!(await isPhase5FlagEnabled(ctx, "phase5.product_analytics"))) {
      return { enabled: false as const };
    }

    const activity = await ctx.db.query("userActivityDaily").take(5000);
    const today = dateKeyOffset(0);
    const weekKeys = new Set(
      Array.from({ length: 7 }, (_, i) => dateKeyOffset(i))
    );
    const monthKeys = new Set(
      Array.from({ length: 30 }, (_, i) => dateKeyOffset(i))
    );

    const dauUsers = new Set<string>();
    const wauUsers = new Set<string>();
    const mauUsers = new Set<string>();
    for (const row of activity) {
      if (row.dateKey === today) dauUsers.add(row.userId);
      if (weekKeys.has(row.dateKey)) wauUsers.add(row.userId);
      if (monthKeys.has(row.dateKey)) mauUsers.add(row.userId);
    }

    const stats = await ctx.db.query("platformStatsDaily").take(30);
    stats.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
    const last7 = stats.slice(0, 7);
    const aiRequests = last7.reduce((s, r) => s + (r.aiRequests ?? 0), 0);
    const newUsers = last7.reduce((s, r) => s + (r.newUsers ?? 0), 0);
    const messages = last7.reduce((s, r) => s + (r.messages ?? 0), 0);

    const posts = await ctx.db.query("socialPosts").take(200);
    const weekAgo = Date.now() - 7 * 86_400_000;
    const postsWeek = posts.filter((p) => p.createdAt >= weekAgo).length;

    // Rough retention: users active today who were also active 7 days ago
    const weekAgoKey = dateKeyOffset(7);
    const retained = new Set(
      activity.filter((r) => r.dateKey === weekAgoKey).map((r) => r.userId)
    );
    let retainedDau = 0;
    for (const u of dauUsers) {
      if (retained.has(u)) retainedDau += 1;
    }

    return {
      enabled: true as const,
      generatedAt: Date.now(),
      users: {
        dau: dauUsers.size,
        wau: wauUsers.size,
        mau: mauUsers.size,
        day7RetentionPct:
          dauUsers.size > 0 ? Math.round((retainedDau / dauUsers.size) * 100) : 0,
      },
      engagement: {
        aiRequestsLast7d: aiRequests,
        messagesLast7d: messages,
        newUsersLast7d: newUsers,
        socialPostsLast7d: postsWeek,
      },
      note: "Aggregates only — no message content or PII beyond activity counters.",
    };
  },
});
