import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { logChatReply } from "./chatReplyLog";
import {
  decideJobRecovery,
  getJobRecoveryConfig,
} from "./chatReplyRecoveryPolicy";
import { isFastTextReplyJob } from "./researchCapabilities";
import {
  chatUserFacingMessage,
  recoveryErrorCodeForJob,
} from "./chatUserMessages";

/**
 * Safety net for chat reply jobs whose background worker never ran or died
 * mid-flight (lost scheduler run, deploy restart, transient crash). Without this
 * the job would sit in the table forever, the assistant reply would never be
 * written, and chat history would be missing a turn. This runs on a cron and:
 *
 *  - reschedules pending jobs that were never picked up,
 *  - writes a graceful fallback reply for jobs that are clearly dead so the
 *    client's live query clears "Thinking…" and the conversation is preserved,
 *  - deletes leftover finished/cancelled jobs.
 */

const MAX_JOBS_PER_SWEEP = 200;

async function conversationHasReplyAfter(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  since: number
): Promise<boolean> {
  const rows = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) =>
      q.eq("conversationId", conversationId)
    )
    .order("desc")
    .take(8);
  return rows.some(
    (m) => m.role === "assistant" && m.createdAt >= since
  );
}

export const recoverStuckJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const config = getJobRecoveryConfig();
    const jobs = await ctx.db.query("chatReplyJobs").take(MAX_JOBS_PER_SWEEP);

    let rescheduled = 0;
    let recovered = 0;
    let cleaned = 0;

    for (const job of jobs) {
      const age = now - job.createdAt;
      const action = decideJobRecovery(
        {
          status: job.status,
          cancelled: job.cancelled,
          createdAt: job.createdAt,
          processingStartedAt: job.processingStartedAt,
          lastActivityAt: job.lastActivityAt,
          rescheduleCount: job.rescheduleCount,
          content: job.content,
          kind: job.kind,
        },
        now,
        config
      );

      if (action === "cleanup") {
        await ctx.db.delete(job._id);
        cleaned += 1;
        continue;
      }

      if (action === "finalize") {
        const alreadyReplied = await conversationHasReplyAfter(
          ctx,
          job.conversationId,
          job.createdAt
        );
        let wroteFallback = false;
        if (!alreadyReplied) {
          const errorCode = recoveryErrorCodeForJob(job);
          const fallbackContent = chatUserFacingMessage(errorCode, {
            research: Boolean(job.liveWeb),
          });
          const persisted = await ctx.runMutation(
            internal.platform.appendAssistantReplyIfMissing,
            {
              conversationId: job.conversationId,
              userId: job.userId,
              content: fallbackContent,
              since: job.createdAt,
            }
          );
          wroteFallback = persisted.written;
          if (wroteFallback) {
            await ctx.runMutation(
              internal.platformStatsRecorder.recordAiRequestInternal,
              { failed: true }
            );
          }
        }
        await ctx.db.delete(job._id);
        recovered += 1;
        logChatReply("job_recovered", {
          jobId: job._id,
          conversationId: job.conversationId,
          userId: job.userId,
          status: job.status,
          ageMs: age,
          wroteFallback,
          conversational: isFastTextReplyJob(job),
        });
        continue;
      }

      if (action === "reschedule") {
        await ctx.runMutation(internal.chatReplyJobs.incrementJobReschedule, {
          jobId: job._id,
        });
        const worker =
          job.kind === "conversational"
            ? internal.chatConversationalReply.processTurn
            : internal.chatReplyWorker.processJob;
        await ctx.scheduler.runAfter(0, worker, {
          jobId: job._id,
        });
        rescheduled += 1;
        logChatReply("job_rescheduled", {
          jobId: job._id,
          conversationId: job.conversationId,
          userId: job.userId,
          ageMs: age,
          status: job.status,
        });
      }
    }

    if (rescheduled || recovered || cleaned) {
      logChatReply("recovery_sweep", {
        scanned: jobs.length,
        rescheduled,
        recovered,
        cleaned,
      });
    }

    return { scanned: jobs.length, rescheduled, recovered, cleaned };
  },
});
