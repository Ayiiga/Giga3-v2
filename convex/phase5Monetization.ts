import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase5FlagEnabled } from "./phase5Controls";

/**
 * Monetization beta readiness summary — reuses economy data, does not change payouts.
 */
export const getMonetizationBetaSummary = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.monetization_beta"))) {
      return { enabled: false as const };
    }
    const userId = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const boosts = await ctx.db
      .query("socialPostBoosts")
      .withIndex("by_creator_created", (q) => q.eq("creatorId", userId))
      .order("desc")
      .take(20);
    const payouts = await ctx.db
      .query("creatorPayouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .order("desc")
      .take(10);

    const activeBoosts = boosts.filter(
      (b) => b.status === "active" && b.endsAt > Date.now()
    );
    return {
      enabled: true as const,
      verified: Boolean(profile?.verified),
      verificationStatus: profile?.verificationStatus ?? "none",
      tools: {
        boostedPostsReady: true,
        earningsDashboardReady: true,
        subscriptionReady: false,
      },
      earnings: {
        boostSpendGhs: boosts.reduce((s, b) => s + (b.budgetGhs ?? 0), 0),
        activeBoosts: activeBoosts.length,
        payoutHistoryCount: payouts.length,
        lastPayoutStatus: payouts[0]?.status ?? null,
        payoutBalanceGhs: profile?.payoutBalanceGhs ?? 0,
        totalEarningsGhs: profile?.totalEarningsGhs ?? 0,
      },
      note: "Beta readiness only — existing Paystack / economy flows unchanged.",
    };
  },
});
