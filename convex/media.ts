"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { FalImageSize } from "./falClient";
import { buildImagePrompt, buildVideoPrompt } from "./mediaCatalog";
import { assertCreditsAvailable, chargeCreditsForMedia } from "./mediaCredits";
import { generateImageWithFallback, generateVideoWithFallback } from "./mediaEngine";
import { persistImageUrlIfNeeded } from "./mediaStorage";
import { toUserMediaError } from "./mediaUtils";
import { requireSessionWithMonitoring } from "./auth";
import { shouldOfferOpenAiImageGeneration } from "./premiumImage";

const imageSizeValidator = v.optional(
  v.union(
    v.literal("square_hd"),
    v.literal("square"),
    v.literal("portrait_4_3"),
    v.literal("portrait_16_9"),
    v.literal("landscape_4_3"),
    v.literal("landscape_16_9"),
    v.object({ width: v.number(), height: v.number() }),
  ),
);

const VIDEO_TOKEN_COST = 5;
const IMAGE_TOKEN_COST = 2;

const sharedMediaArgs = {
  sessionToken: v.string(),
  category: v.optional(v.string()),
};

export const generateVideo = action({
  args: {
    ...sharedMediaArgs,
    prompt: v.string(),
    imageUrl: v.optional(v.string()),
    negativePrompt: v.optional(v.string()),
    enablePromptExpansion: v.optional(v.boolean()),
    agenticMaxIterations: v.optional(v.number()),
    agenticSamplesPerIteration: v.optional(v.number()),
    agenticEarlyStop: v.optional(v.boolean()),
    imageSize: imageSizeValidator,
    numFrames: v.optional(v.number()),
    framesPerSecond: v.optional(v.number()),
    numInferenceSteps: v.optional(v.number()),
    guidanceScale: v.optional(v.number()),
    seed: v.optional(v.number()),
    enableSafetyChecker: v.optional(v.boolean()),
    syncMode: v.optional(v.boolean()),
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
    const category = args.category ?? "anime_videos";
    const fullPrompt = buildVideoPrompt(category, args.prompt);
    const creditMode = Boolean(args.category);

    const user = await ctx.runQuery(api.users.getUser, {
      sessionToken: args.sessionToken,
    });
    if (!user) throw new Error("User not found");

    let jobId: Id<"mediaJobs"> | undefined;

    try {
      if (creditMode) {
        await assertCreditsAvailable(ctx, args.sessionToken, "video");
        jobId = await ctx.runMutation(internal.mediaInternal.createMediaJob, {
          userId: email,
          mediaType: "video",
          category,
          prompt: fullPrompt,
          creditsCharged: 0,
        });
      } else if ((user.tokens ?? 0) < VIDEO_TOKEN_COST) {
        throw new Error(`Insufficient tokens (need ${VIDEO_TOKEN_COST} for video)`);
      }

      const result = await generateVideoWithFallback({
        prompt: fullPrompt,
        category,
        imageUrl: args.imageUrl,
        negativePrompt: args.negativePrompt,
        enablePromptExpansion: args.enablePromptExpansion,
        agenticMaxIterations: args.agenticMaxIterations,
        agenticSamplesPerIteration: args.agenticSamplesPerIteration,
        agenticEarlyStop: args.agenticEarlyStop,
        imageSize: args.imageSize as FalImageSize | undefined,
        numFrames: args.numFrames,
        framesPerSecond: args.framesPerSecond,
        numInferenceSteps: args.numInferenceSteps,
        guidanceScale: args.guidanceScale,
        seed: args.seed,
        enableSafetyChecker: args.enableSafetyChecker,
        syncMode: args.syncMode,
        duration: args.duration,
        resolution: args.resolution,
        generateAudio: args.generateAudio,
        aspectRatio: args.aspectRatio,
      });

      if (creditMode && jobId) {
        await chargeCreditsForMedia(ctx, args.sessionToken, "video", String(jobId));
      }

      if (jobId) {
        await ctx.runMutation(internal.mediaInternal.completeMediaJob, {
          jobId,
          status: "succeeded",
          outputUrl: result.videoUrl,
          replicatePredictionId:
            result.provider === "replicate" ? result.externalId : undefined,
        });
      }

      let tokens = user.tokens ?? 0;
      if (!creditMode) {
        tokens = await ctx.runMutation(api.users.deductTokens, {
          sessionToken: args.sessionToken,
          amount: VIDEO_TOKEN_COST,
        });
      }

      return {
        videoUrl: result.videoUrl,
        outputUrl: result.videoUrl,
        contentType: result.contentType ?? "video/mp4",
        seed: result.seed,
        requestId: result.externalId,
        provider: result.provider,
        tokens,
        jobId,
      };
    } catch (err) {
      const message = toUserMediaError(err, "video");
      if (jobId) {
        await ctx.runMutation(internal.mediaInternal.completeMediaJob, {
          jobId,
          status: "failed",
          errorMessage: message,
        });
      }
      throw new Error(message);
    }
  },
});

export const generateImage = action({
  args: {
    ...sharedMediaArgs,
    prompt: v.string(),
    sourceImageUrl: v.optional(v.string()),
    negativePrompt: v.optional(v.string()),
    imageSize: imageSizeValidator,
    numInferenceSteps: v.optional(v.number()),
    guidanceScale: v.optional(v.number()),
    seed: v.optional(v.number()),
    enableSafetyChecker: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const email = await requireSessionWithMonitoring(args.sessionToken, ctx);
    const category = args.category ?? "anime_art";
    const fullPrompt = buildImagePrompt(category, args.prompt);
    const creditMode = Boolean(args.category);

    const user = await ctx.runQuery(api.users.getUser, {
      sessionToken: args.sessionToken,
    });
    if (!user) throw new Error("User not found");

    let jobId: Id<"mediaJobs"> | undefined;

    try {
      if (creditMode) {
        await assertCreditsAvailable(ctx, args.sessionToken, "image");
        jobId = await ctx.runMutation(internal.mediaInternal.createMediaJob, {
          userId: email,
          mediaType: "image",
          category,
          prompt: fullPrompt,
          creditsCharged: 0,
        });
      } else if ((user.tokens ?? 0) < IMAGE_TOKEN_COST) {
        throw new Error(`Insufficient tokens (need ${IMAGE_TOKEN_COST} for image)`);
      }

      const allowOpenAi = shouldOfferOpenAiImageGeneration(
        user.subscriptionPlan ?? "free",
        user.subscriptionExpiresAt
      );

      const result = await generateImageWithFallback(
        {
          prompt: fullPrompt,
          category,
          sourceImageUrl: args.sourceImageUrl,
          negativePrompt: args.negativePrompt,
          imageSize: args.imageSize as FalImageSize | undefined,
          numInferenceSteps: args.numInferenceSteps,
          guidanceScale: args.guidanceScale,
          seed: args.seed,
          enableSafetyChecker: args.enableSafetyChecker,
        },
        { allowOpenAi }
      );

      const imageUrl = await persistImageUrlIfNeeded(ctx, result.imageUrl);

      if (creditMode && jobId) {
        await chargeCreditsForMedia(ctx, args.sessionToken, "image", String(jobId));
      }

      if (jobId) {
        await ctx.runMutation(internal.mediaInternal.completeMediaJob, {
          jobId,
          status: "succeeded",
          outputUrl: imageUrl,
          replicatePredictionId:
            result.provider === "replicate" ? result.externalId : undefined,
        });
      }

      let tokens = user.tokens ?? 0;
      if (!creditMode) {
        tokens = await ctx.runMutation(api.users.deductTokens, {
          sessionToken: args.sessionToken,
          amount: IMAGE_TOKEN_COST,
        });
      }

      return {
        imageUrl,
        outputUrl: imageUrl,
        requestId: result.externalId,
        provider: result.provider,
        tokens,
        jobId,
      };
    } catch (err) {
      const message = toUserMediaError(err, "image");
      if (jobId) {
        await ctx.runMutation(internal.mediaInternal.completeMediaJob, {
          jobId,
          status: "failed",
          errorMessage: message,
        });
      }
      throw new Error(message);
    }
  },
});
