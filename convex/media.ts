import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  buildImagePrompt,
  buildVideoPrompt,
} from "./mediaCatalog";
import {
  replicateGenerateImage,
  replicateGenerateVideo,
} from "./replicateClient";
import { CREDIT_COSTS } from "./creditsConfig";

export const listJobs = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("mediaJobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
    return rows;
  },
});

export const insertJob = internalMutation({
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

export const finishJob = internalMutation({
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

export const generateImage = action({
  args: {
    userId: v.string(),
    category: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const fullPrompt = buildImagePrompt(args.category, args.prompt);
    const jobId = await ctx.runMutation(internal.media.insertJob, {
      userId: args.userId,
      mediaType: "image",
      category: args.category,
      prompt: args.prompt,
      creditsCharged: CREDIT_COSTS.image,
    });

    try {
      await ctx.runMutation(api.credits.deductCredits, {
        userId: args.userId,
        action: "image",
        reference: String(jobId),
        metadata: JSON.stringify({ category: args.category }),
      });

      const result = await replicateGenerateImage(fullPrompt);
      await ctx.runMutation(internal.media.finishJob, {
        jobId,
        status: "succeeded",
        outputUrl: result.outputUrl,
        replicatePredictionId: result.predictionId,
      });

      return { jobId, outputUrl: result.outputUrl };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Image generation failed";
      await ctx.runMutation(internal.media.finishJob, {
        jobId,
        status: "failed",
        errorMessage: message,
      });
      throw e;
    }
  },
});

export const generateVideo = action({
  args: {
    userId: v.string(),
    category: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const fullPrompt = buildVideoPrompt(args.category, args.prompt);
    const jobId = await ctx.runMutation(internal.media.insertJob, {
      userId: args.userId,
      mediaType: "video",
      category: args.category,
      prompt: args.prompt,
      creditsCharged: CREDIT_COSTS.video,
    });

    try {
      await ctx.runMutation(api.credits.deductCredits, {
        userId: args.userId,
        action: "video",
        reference: String(jobId),
        metadata: JSON.stringify({ category: args.category }),
      });

      const result = await replicateGenerateVideo(fullPrompt);
      await ctx.runMutation(internal.media.finishJob, {
        jobId,
        status: "succeeded",
        outputUrl: result.outputUrl,
        replicatePredictionId: result.predictionId,
      });

      return { jobId, outputUrl: result.outputUrl };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Video generation failed";
      await ctx.runMutation(internal.media.finishJob, {
        jobId,
        status: "failed",
        errorMessage: message,
      });
      throw e;
    }
  },
});
