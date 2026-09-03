import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/** A job still "processing" after this long has lost its worker (crash/timeout). */
export const STUCK_JOB_AFTER_MS = 30 * 60 * 1000;
/** Fail sooner when progress stops (worker death ~10 min Convex action limit). */
export const STALE_PROGRESS_AFTER_MS = 12 * 60 * 1000;

const STUCK_MESSAGE =
  "Video generation took too long and was stopped. Your credits were refunded — please try again.";

export const listStuckVideoJobs = internalQuery({
  args: { olderThanMs: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    return await ctx.db
      .query("videoJobs")
      .withIndex("by_status_created", (q) => q.eq("status", "processing").lt("createdAt", cutoff))
      .take(args.limit ?? 50);
  },
});

/**
 * Daily-safe sweep (runs every 10 minutes): fail orphaned Media Studio and
 * Video AI jobs and give the reserved credits back. Idempotent.
 */
export const recoverStuckJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const media = await ctx.runQuery(internal.mediaInternal.listStuckMediaJobs, {
      olderThanMs: STALE_PROGRESS_AFTER_MS,
    });
    let mediaRecovered = 0;
    for (const job of media) {
      const refund = await ctx.runMutation(internal.mediaInternal.refundMediaJobCredits, {
        jobId: job._id,
        reason: "stuck_job_sweep",
      });
      await ctx.runMutation(internal.mediaInternal.completeMediaJob, {
        jobId: job._id,
        status: "failed",
        errorMessage: refund.refunded ? STUCK_MESSAGE : STUCK_MESSAGE.replace(" Your credits were refunded —", ""),
        creditsRefunded: refund.refunded,
      });
      mediaRecovered += 1;
    }

    const video = await ctx.runQuery(internal.mediaJobRecovery.listStuckVideoJobs, {
      olderThanMs: STUCK_JOB_AFTER_MS,
    });
    let videoRecovered = 0;
    for (const job of video) {
      if (job.videoCreditsCharged > 0) {
        await ctx.runMutation(internal.videoCredits.refundVideoCreditsInternal, {
          userId: job.userId,
          amount: job.videoCreditsCharged,
          category: job.category,
          reference: String(job._id),
        });
      }
      await ctx.runMutation(internal.videoInternal.completeVideoJob, {
        jobId: job._id,
        status: "failed",
        errorMessage: STUCK_MESSAGE,
      });
      videoRecovered += 1;
    }

    if (mediaRecovered || videoRecovered) {
      console.log("[mediaJobRecovery] recovered", { mediaRecovered, videoRecovered });
    }
    return { mediaRecovered, videoRecovered };
  },
});
