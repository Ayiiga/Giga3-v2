import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const createJob = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    mode: v.string(),
    content: v.string(),
    attachmentsJson: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("reply"), v.literal("regenerate"))),
    regenerateFromMessageId: v.optional(v.id("messages")),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.clientRequestId) {
      const existing = await ctx.db
        .query("chatReplyJobs")
        .withIndex("by_clientRequest", (q) =>
          q.eq("clientRequestId", args.clientRequestId)
        )
        .first();
      if (existing && existing.status !== "failed" && existing.status !== "cancelled") {
        return existing._id;
      }
    }

    return await ctx.db.insert("chatReplyJobs", {
      conversationId: args.conversationId,
      userId: args.userId,
      mode: args.mode,
      content: args.content,
      attachmentsJson: args.attachmentsJson,
      kind: args.kind ?? "reply",
      regenerateFromMessageId: args.regenerateFromMessageId,
      clientRequestId: args.clientRequestId,
      cancelled: false,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const getJob = internalQuery({
  args: { jobId: v.id("chatReplyJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const getActiveJobForConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("chatReplyJobs")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(5);
    return (
      rows.find(
        (row) => row.status === "pending" || row.status === "processing"
      ) ?? null
    );
  },
});

export const markJobStatus = internalMutation({
  args: {
    jobId: v.id("chatReplyJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: args.status });
  },
});

export const cancelJob = internalMutation({
  args: { jobId: v.id("chatReplyJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return { ok: false as const };
    if (job.status === "done" || job.status === "failed") {
      return { ok: false as const };
    }
    await ctx.db.patch(args.jobId, {
      cancelled: true,
      status: "cancelled",
    });
    return { ok: true as const };
  },
});

export const deleteJob = internalMutation({
  args: { jobId: v.id("chatReplyJobs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.jobId);
  },
});
