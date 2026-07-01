import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const createJob = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    mode: v.string(),
    content: v.string(),
    attachmentsJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatReplyJobs", {
      conversationId: args.conversationId,
      userId: args.userId,
      mode: args.mode,
      content: args.content,
      attachmentsJson: args.attachmentsJson,
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

export const markJobStatus = internalMutation({
  args: {
    jobId: v.id("chatReplyJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("done"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: args.status });
  },
});

export const deleteJob = internalMutation({
  args: { jobId: v.id("chatReplyJobs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.jobId);
  },
});
