import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireSessionWithMonitoring } from "./auth";
import { buildVideoAiPrompt } from "./videoCatalog";
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

const aspectRatioValidator = v.optional(
  v.union(
    v.literal("16:9"),
    v.literal("9:16"),
    v.literal("4:3"),
    v.literal("1:1"),
    v.literal("3:4"),
    v.literal("21:9")
  )
);

const generateArgs = {
  sessionToken: v.string(),
  category: v.string(),
  prompt: v.string(),
  imageUrl: v.optional(v.string()),
  negativePrompt: v.optional(v.string()),
  imageSize: imageSizeValidator,
  duration: v.optional(v.number()),
  resolution: v.optional(v.string()),
  generateAudio: v.optional(v.boolean()),
  aspectRatio: aspectRatioValidator,
};

/**
 * Queues video generation server-side and returns immediately.
 * The client polls job status — avoids long HTTP waits on poor mobile networks.
 */
export const generate = action({
  args: generateArgs,
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

    const jobId: Id<"videoJobs"> = await ctx.runMutation(
      internal.videoInternal.createVideoJobWithReservation,
      {
        userId: email,
        category,
        mode: category,
        prompt: fullPrompt,
        sourceImageUrl: args.imageUrl,
        cost,
      }
    );

    await ctx.scheduler.runAfter(0, internal.videoAIWorker.processJob, {
      jobId,
      userId: email,
      category,
      prompt: fullPrompt,
      imageUrl: args.imageUrl,
      negativePrompt: args.negativePrompt,
      imageSize: args.imageSize,
      duration: args.duration,
      resolution: args.resolution,
      generateAudio: args.generateAudio,
      aspectRatio: args.aspectRatio,
    });

    return {
      jobId,
      status: "processing" as const,
      videoCredits: walletBefore.videoCredits - cost,
      videoCreditsCharged: cost,
      message:
        "Video is generating in the background. On slow networks you can leave this page and check Recent videos shortly.",
    };
  },
});
