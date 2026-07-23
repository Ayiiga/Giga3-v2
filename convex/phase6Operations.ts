import { query } from "./_generated/server";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { isPhase6FlagEnabled } from "./phase6Controls";

/** Platform operations dashboard — admin only, flag-gated. */
export const getOperationsDashboard = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!(await isPhase6FlagEnabled(ctx, "phase6.operations"))) {
      return { enabled: false as const };
    }

    const health = await ctx.db
      .query("systemHealthSnapshots")
      .withIndex("by_service_created", (q) => q.eq("service", "convex"))
      .order("desc")
      .take(10);
    const latestAny = await ctx.db.query("systemHealthSnapshots").take(40);
    latestAny.sort((a, b) => b.createdAt - a.createdAt);

    const security = await ctx.db.query("securityEvents").take(50);
    const degraded = latestAny.filter((h) => h.status !== "healthy").length;

    return {
      enabled: true as const,
      health: {
        samples: latestAny.slice(0, 10).map((h) => ({
          service: h.service,
          status: h.status,
          latencyMs: h.latencyMs,
          createdAt: h.createdAt,
        })),
        degradedCount: degraded,
        convexSamples: health.length,
      },
      security: {
        recentEvents: security.length,
      },
      capacity: {
        planningReady: true,
        autoscalingNote:
          "Static Pages + Convex managed scale — monitor latency/error rates before raising limits.",
      },
      incident: {
        playbook: "Disable affected phase6.*/phase5.* flag → verify → redeploy prior SHA if needed.",
        rollbackReady: true,
      },
    };
  },
});
