import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { falGenerateImage, falGenerateVideo, type FalImageSize } from "./falClient";

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

export const generateVideo = action({
  args: {
    email: v.string(),
    prompt: v.string(),
    imageUrl: v.string(),
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
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getUser, { email: args.email });
    if (!user) {
      throw new Error("User not found");
    }
    if ((user.tokens ?? 0) < VIDEO_TOKEN_COST) {
      throw new Error(`Insufficient tokens (need ${VIDEO_TOKEN_COST} for video)`);
    }

    const result = await falGenerateVideo({
      prompt: args.prompt,
      image_url: args.imageUrl,
      negative_prompt: args.negativePrompt,
      enable_prompt_expansion: args.enablePromptExpansion,
      agentic_max_iterations: args.agenticMaxIterations,
      agentic_samples_per_iteration: args.agenticSamplesPerIteration,
      agentic_early_stop: args.agenticEarlyStop,
      image_size: args.imageSize as FalImageSize | undefined,
      num_frames: args.numFrames,
      frames_per_second: args.framesPerSecond,
      num_inference_steps: args.numInferenceSteps,
      guidance_scale: args.guidanceScale,
      seed: args.seed,
      enable_safety_checker: args.enableSafetyChecker,
      sync_mode: args.syncMode,
    });

    const tokens = await ctx.runMutation(api.users.deductTokens, {
      email: args.email,
      amount: VIDEO_TOKEN_COST,
    });

    return {
      videoUrl: result.videoUrl,
      contentType: result.contentType ?? "video/mp4",
      seed: result.seed,
      requestId: result.requestId,
      tokens,
    };
  },
});

export const generateImage = action({
  args: {
    email: v.string(),
    prompt: v.string(),
    negativePrompt: v.optional(v.string()),
    imageSize: imageSizeValidator,
    numInferenceSteps: v.optional(v.number()),
    guidanceScale: v.optional(v.number()),
    seed: v.optional(v.number()),
    enableSafetyChecker: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getUser, { email: args.email });
    if (!user) {
      throw new Error("User not found");
    }
    if ((user.tokens ?? 0) < IMAGE_TOKEN_COST) {
      throw new Error(`Insufficient tokens (need ${IMAGE_TOKEN_COST} for image)`);
    }

    const result = await falGenerateImage({
      prompt: args.prompt,
      negative_prompt: args.negativePrompt,
      image_size: args.imageSize as FalImageSize | undefined,
      num_inference_steps: args.numInferenceSteps,
      guidance_scale: args.guidanceScale,
      seed: args.seed,
      enable_safety_checker: args.enableSafetyChecker,
    });

    const tokens = await ctx.runMutation(api.users.deductTokens, {
      email: args.email,
      amount: IMAGE_TOKEN_COST,
    });

    return {
      imageUrl: result.imageUrl,
      requestId: result.requestId,
      tokens,
    };
  },
});
