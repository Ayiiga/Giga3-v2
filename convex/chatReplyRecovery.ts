import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { normalizeUserId } from "./userIds";
import { logChatReply } from "./chatReplyLog";
import {
  DEFAULT_JOB_RECOVERY_CONFIG,
  decideJobRecovery,
} from "./chatReplyRecoveryPolicy";

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

const FALLBACK_REPLY =
  "I'm Giga3 AI — I couldn't finish this reply because our AI service didn't respond in time. Your message was saved — please tap send again.";

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
    .collect();
  const last = rows
    .filter((m) => m.role !== "system")
    .sort((a, b) => a.createdAt - b.createdAt)
    .at(-1);
  return Boolean(last && last.role === "assistant" && last.createdAt >= since);
}

export const recoverStuckJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const jobs = await ctx.db.query("chatReplyJobs").take(MAX_JOBS_PER_SWEEP);

    let rescheduled = 0;
    let recovered = 0;
    let cleaned = 0;

    for (const job of jobs) {
      const age = now - job.createdAt;
      const action = decideJobRecovery(
        { status: job.status, cancelled: job.cancelled, createdAt: job.createdAt },
        now,
        DEFAULT_JOB_RECOVERY_CONFIG
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
        if (!alreadyReplied) {
          await ctx.db.insert("messages", {
            conversationId: job.conversationId,
            userId: normalizeUserId(job.userId),
            role: "assistant",
            content: FALLBACK_REPLY,
            createdAt: Date.now(),
          });
          await ctx.db.patch(job.conversationId, { updatedAt: Date.now() });
          await ctx.scheduler.runAfter(
            0,
            internal.platformStatsRecorder.recordMessageInternal,
            { role: "assistant" }
          );
          await ctx.scheduler.runAfter(
            0,
            internal.platformStatsRecorder.recordAiRequestInternal,
            { failed: true }
          );
        }
        await ctx.db.delete(job._id);
        recovered += 1;
        logChatReply("job_recovered", {
          jobId: job._id,
          conversationId: job.conversationId,
          userId: job.userId,
          status: job.status,
          ageMs: age,
          wroteFallback: !alreadyReplied,
        });
        continue;
      }

      if (action === "reschedule") {
        await ctx.scheduler.runAfter(0, internal.chatReplyWorker.processJob, {
          jobId: job._id,
        });
        rescheduled += 1;
        logChatReply("job_rescheduled", {
          jobId: job._id,
          conversationId: job.conversationId,
          userId: job.userId,
          ageMs: age,
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
