"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateVideoWithFallback } from "./mediaEngine";
import { persistVideoUrlIfPossible } from "./mediaStorage";
import { toUserMediaError } from "./mediaUtils";

/**
 * Background worker for Media Studio video jobs. Runs the fal → Replicate
 * chain, streams provider progress into the job row, persists the result to
 * Convex storage when it is small enough, and refunds reserved credits on
 * failure. Safe to re-run: terminal jobs are skipped.
 */
export const processJob = internalAction({
  args: {
    jobId: v.id("mediaJobs"),
    prompt: v.string(),
    category: v.string(),
    imageUrl: v.optional(v.string()),
    negativePrompt: v.optional(v.string()),
    seed: v.optional(v.number()),
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
    const job = await ctx.runQuery(internal.mediaInternal.getMediaJobInternal, {
      jobId: args.jobId,
    });
    if (!job || job.status !== "processing") return { skipped: true as const };

    await ctx.runMutation(internal.mediaInternal.updateMediaJobProgress, {
      jobId: args.jobId,
      stage: "starting",
      label: "Contacting video provider…",
    });

    let lastLabel = "";
    try {
      const result = await generateVideoWithFallback(
        {
          prompt: args.prompt,
          category: args.category,
          imageUrl: args.imageUrl,
          negativePrompt: args.negativePrompt,
          seed: args.seed,
          duration: args.duration,
          resolution: args.resolution,
          generateAudio: args.generateAudio,
          aspectRatio: args.aspectRatio,
        },
        {
          onProgress: async (event) => {
            const key = `${event.provider}:${event.label}`;
            if (key === lastLabel) return;
            lastLabel = key;
            await ctx.runMutation(internal.mediaInternal.updateMediaJobProgress, {
              jobId: args.jobId,
              stage: event.stage,
              label: event.label,
              provider: event.provider,
              externalId: event.externalId,
              modelId: event.modelId,
            });
          },
        }
      );

      await ctx.runMutation(internal.mediaInternal.updateMediaJobProgress, {
        jobId: args.jobId,
        stage: "finishing",
        label: "Saving your video…",
        provider: result.provider,
        externalId: result.externalId,
        modelId: result.modelId,
      });

      const outputUrl = await persistVideoUrlIfPossible(ctx, result.videoUrl, result.contentType);

      await ctx.runMutation(internal.mediaInternal.completeMediaJob, {
        jobId: args.jobId,
        status: "succeeded",
        outputUrl,
        provider: result.provider,
        externalId: result.externalId,
        modelId: result.modelId,
        replicatePredictionId: result.provider === "replicate" ? result.externalId : undefined,
      });
      return { ok: true as const, provider: result.provider };
    } catch (err) {
      const message = toUserMediaError(err, "video");
      console.error("[mediaVideoWorker] job failed", args.jobId, err);
      const refund = await ctx.runMutation(internal.mediaInternal.refundMediaJobCredits, {
        jobId: args.jobId,
        reason: "generation_failed",
      });
      await ctx.runMutation(internal.mediaInternal.completeMediaJob, {
        jobId: args.jobId,
        status: "failed",
        errorMessage: refund.refunded
          ? `${message} Your ${refund.refunded} credits were refunded.`
          : message,
        creditsRefunded: refund.refunded,
      });
      return { ok: false as const };
    }
  },
});
