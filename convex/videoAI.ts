"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { FalImageSize } from "./falClient";
import { requireSessionWithMonitoring } from "./auth";
import { generateVideoWithFallback } from "./mediaEngine";
import { toUserMediaError } from "./mediaUtils";
import { buildVideoAiPrompt, videoAiAspectRatio } from "./videoCatalog";
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

export const generate = action({
  args: {
    sessionToken: v.string(),
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
    const email = await requireSessionWithMonitoring(args.sessionToken, ctx);
    const category = args.category || "text_to_video";
    const fullPrompt = buildVideoAiPrompt(category, args.prompt);
    const cost = videoCostForCategory(category);

    await ctx.runMutation(internal.videoCredits.grantVideoStarterCreditsInternal, {
      userId: email,
    });

    const walletBefore = await ctx.runQuery(api.videoCredits.getVideoWallet, {
      sessionToken: args.sessionToken,
    });
    if (walletBefore.videoCredits < cost) {
      throw new Error(
        `Insufficient video credits (${cost} required, ${walletBefore.videoCredits} available). Buy a Video AI pack at /video/plans.`
      );
    }

    let jobId: Id<"videoJobs"> | undefined;

    try {
      jobId = await ctx.runMutation(internal.videoInternal.createVideoJob, {
        userId: email,
        category,
        mode: category,
        prompt: fullPrompt,
        sourceImageUrl: args.imageUrl,
        videoCreditsCharged: 0,
      });

      const result = await generateVideoWithFallback({
        prompt: fullPrompt,
        category,
        imageUrl: args.imageUrl,
        negativePrompt: args.negativePrompt,
        imageSize: args.imageSize as FalImageSize | undefined,
        duration: args.duration,
        resolution: args.resolution,
        generateAudio: args.generateAudio,
        aspectRatio: args.aspectRatio ?? videoAiAspectRatio(category),
      });

      await ctx.runMutation(internal.videoCredits.deductVideoCreditsInternal, {
        userId: email,
        amount: cost,
        category,
        reference: String(jobId),
      });

      await ctx.runMutation(internal.videoInternal.completeVideoJob, {
        jobId,
        status: "succeeded",
        outputUrl: result.videoUrl,
        provider: result.provider,
        externalId: result.externalId,
        videoCreditsCharged: cost,
      });

      const wallet = await ctx.runQuery(api.videoCredits.getVideoWallet, {
        sessionToken: args.sessionToken,
      });

      return {
        videoUrl: result.videoUrl,
        outputUrl: result.videoUrl,
        contentType: result.contentType ?? "video/mp4",
        provider: result.provider,
        requestId: result.externalId,
        jobId,
        videoCredits: wallet.videoCredits,
        videoCreditsCharged: cost,
      };
    } catch (err) {
      const message = toUserMediaError(err, "video");
      if (jobId) {
        await ctx.runMutation(internal.videoInternal.completeVideoJob, {
          jobId,
          status: "failed",
          errorMessage: message,
        });
      }
      throw new Error(message);
    }
  },
});
