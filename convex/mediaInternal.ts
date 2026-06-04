import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createMediaJob = internalMutation({
  args: {
    userId: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    category: v.string(),
    prompt: v.string(),
    creditsCharged: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mediaJobs", {
      userId: args.userId,
      mediaType: args.mediaType,
      category: args.category,
      prompt: args.prompt,
      status: "processing",
      creditsCharged: args.creditsCharged,
      createdAt: Date.now(),
    });
  },
});

export const completeMediaJob = internalMutation({
  args: {
    jobId: v.id("mediaJobs"),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
    outputUrl: v.optional(v.string()),
    replicatePredictionId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      outputUrl: args.outputUrl,
      replicatePredictionId: args.replicatePredictionId,
      errorMessage: args.errorMessage,
    });
  },
});
