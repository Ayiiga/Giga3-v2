"use node";

/**
 * Fast conversational reply worker — no live web, no recovery timeout stub.
 * Scheduled from acceptMessage for greetings/small talk instead of the heavy job queue.
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { executeConversationalReply } from "./chatConversationalCore";
import { logChatReply } from "./chatReplyLog";
import { CHAT_ERROR_CODES } from "./chatErrorCodes";
import { chatUserFacingMessage } from "./chatUserMessages";

export const processTurn = internalAction({
  args: { jobId: v.id("chatReplyJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.chatReplyJobs.getJob, {
      jobId: args.jobId,
    });
    if (!job) return;

    if (job.cancelled || job.status === "cancelled") {
      await ctx.runMutation(internal.chatReplyJobs.deleteJob, { jobId: args.jobId });
      return;
    }

    if (job.status === "done") {
      await ctx.runMutation(internal.chatReplyJobs.deleteJob, { jobId: args.jobId });
      return;
    }

    const hasReply = await ctx.runQuery(internal.chatReplyJobs.hasAssistantReplySince, {
      conversationId: job.conversationId,
      since: job.createdAt,
    });
    if (hasReply) {
      await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
        jobId: args.jobId,
        status: "done",
      });
      await ctx.runMutation(internal.chatReplyJobs.deleteJob, { jobId: args.jobId });
      return;
    }

    const begin = await ctx.runMutation(internal.chatReplyJobs.beginProcessing, {
      jobId: args.jobId,
    });
    if (begin.cancelled) {
      await ctx.runMutation(internal.chatReplyJobs.deleteJob, { jobId: args.jobId });
      return;
    }
    if (!begin.claimed) {
      logChatReply("conversational_worker_skip_duplicate", {
        jobId: args.jobId,
        conversationId: job.conversationId,
        userId: job.userId,
      });
      return;
    }

    try {
      await executeConversationalReply(ctx, {
        requestId: job.clientRequestId ?? String(job._id),
        jobId: args.jobId,
        conversationId: job.conversationId,
        userId: job.userId,
        content: job.content,
        mode: job.mode,
        personaId: job.personaId,
        since: job.createdAt,
      });

      await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
        jobId: args.jobId,
        status: "done",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logChatReply("conversational_worker_failed", {
        jobId: args.jobId,
        conversationId: job.conversationId,
        userId: job.userId,
        error: message,
      });
      const fallback = chatUserFacingMessage(CHAT_ERROR_CODES.ALL_PROVIDERS_FAILED);
      const persisted = await ctx.runMutation(
        internal.platform.appendAssistantReplyIfMissing,
        {
          conversationId: job.conversationId,
          userId: job.userId,
          content: fallback,
          since: job.createdAt,
        }
      );
      if (persisted.written) {
        await ctx.runMutation(internal.platformStatsRecorder.recordAiRequestInternal, {
          failed: true,
        });
      }
      await ctx.runMutation(internal.chatReplyJobs.markJobStatus, {
        jobId: args.jobId,
        status: "failed",
      });
    } finally {
      await ctx.runMutation(internal.chatReplyJobs.deleteJob, { jobId: args.jobId });
    }
  },
});
