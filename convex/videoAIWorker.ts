"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { FalImageSize } from "./falClient";
import { generateVideoWithFallback } from "./mediaEngine";
import { toUserMediaError } from "./mediaUtils";
import { videoAiAspectRatio } from "./videoCatalog";
import { videoCostForCategory } from "./videoCreditsConfig";

const imageSizeValidator = v.optional(
  v.union(
    v.literal("square_hd"),
    v.literal("square"),
    v.literal("portrait_4_3"),
    v.literal("portrait_16_9"),
    v.literal("landscape_4_3"),
    v.literal("landscape_16_9"),
    v.object({ width: v.number(), height: v.number() })
  )
);

/** Background worker — keeps the client request short on slow mobile networks. */
export const processJob = internalAction({
  args: {
    jobId: v.id("videoJobs"),
    userId: v.string(),
    category: v.string(),
    prompt: v.string(),
    imageUrl: v.optional(v.string()),
    negativePrompt: v.optional(v.string()),
    imageSize: imageSizeValidator,
    duration: v.optional(v.number()),
    resolution: v.optional(v.string()),
    generateAudio: v.optional(v.boolean()),
    aspectRatio: v.optional(
      v.union(
        v.literal("16:9"),
        v.literal("9:16"),
        v.literal("4:3"),
        v.literal("1:1"),
        v.literal("3:4"),
        v.literal("21:9")
      )
    ),
  },
  handler: async (ctx, args) => {
    const cost = videoCostForCategory(args.category);

    try {
      const result = await generateVideoWithFallback({
        prompt: args.prompt,
        category: args.category,
        imageUrl: args.imageUrl,
        negativePrompt: args.negativePrompt,
        imageSize: args.imageSize as FalImageSize | undefined,
        duration: args.duration,
        resolution: args.resolution,
        generateAudio: args.generateAudio,
        aspectRatio: args.aspectRatio ?? videoAiAspectRatio(args.category),
      });

      await ctx.runMutation(internal.videoCredits.deductVideoCreditsInternal, {
        userId: args.userId,
        amount: cost,
        category: args.category,
        reference: String(args.jobId),
      });

      await ctx.runMutation(internal.videoInternal.completeVideoJob, {
        jobId: args.jobId,
        status: "succeeded",
        outputUrl: result.videoUrl,
        provider: result.provider,
        externalId: result.externalId,
        videoCreditsCharged: cost,
      });
    } catch (err) {
      const message = toUserMediaError(err, "video");
      await ctx.runMutation(internal.videoInternal.completeVideoJob, {
        jobId: args.jobId,
        status: "failed",
        errorMessage: message,
      });
    }
  },
});
