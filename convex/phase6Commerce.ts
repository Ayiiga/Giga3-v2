import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase6FlagEnabled } from "./phase6Controls";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

/** Commerce & payments reliability summary for the signed-in user. */
export const getCommerceSummary = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.commerce"))) {
      return { enabled: false as const };
    }
    const userId = await requireSession(args.sessionToken);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(40);
    payments.sort((a, b) => b.createdAt - a.createdAt);

    const payouts = await ctx.db
      .query("creatorPayouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .take(20);

    const success = payments.filter((p) => p.status === "success");
    const failed = payments.filter((p) => p.status === "failed");

    return {
      enabled: true as const,
      subscriptions: {
        managementHref: "/subscribe/",
        ready: true,
      },
      wallet: {
        href: "/wallet/",
        ready: true,
      },
      transactions: {
        recentCount: payments.length,
        successCount: success.length,
        failedCount: failed.length,
        history: payments.slice(0, 8).map((p) => ({
          id: p._id,
          status: p.status,
          amountGhs: p.amountGhs,
          createdAt: p.createdAt,
          type: p.type,
        })),
      },
      payouts: {
        count: payouts.length,
        lastStatus: payouts[0]?.status ?? null,
      },
      fraudMonitoring: {
        clientHintsEnabled: true,
        note: "Server-side Paystack verification unchanged.",
      },
    };
  },
});

/** Admin commerce health snapshot. */
export const getCommerceAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!(await isPhase6FlagEnabled(ctx, "phase6.commerce"))) {
      return { enabled: false as const };
    }
    const payments = await ctx.db.query("payments").take(200);
    const success = payments.filter((p) => p.status === "success").length;
    const failed = payments.filter((p) => p.status === "failed").length;
    return {
      enabled: true as const,
      sampleSize: payments.length,
      successRatePct:
        payments.length > 0 ? Math.round((success / payments.length) * 100) : 0,
      failedCount: failed,
    };
  },
});
