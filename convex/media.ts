import { action, internalMutation, query, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  buildImagePrompt,
  buildVideoPrompt,
} from "./mediaCatalog";
import { falGenerateImage, falGenerateVideo, getFalApiKey } from "./falClient";
import { openaiGenerateImage, hasOpenAiImageKey } from "./openaiImageClient";
import {
  hasReplicateToken,
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

async function refundMediaCredits(
  ctx: ActionCtx,
  userId: string,
  action: "image" | "video",
  jobId: string,
  reason: string,
) {
  const cost = CREDIT_COSTS[action];
  await ctx.runMutation(internal.credits.grantCreditsInternal, {
    userId,
    credits: cost,
    action: "admin_grant",
    reference: jobId,
    metadata: JSON.stringify({ refund: true, reason }),
  });
}

/** Convex document fields cap at 1 MiB — store large data-URL images in file storage. */
async function persistMediaUrl(ctx: ActionCtx, outputUrl: string): Promise<string> {
  if (!outputUrl.startsWith("data:")) {
    return outputUrl;
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(outputUrl);
  if (!match) {
    return outputUrl;
  }

  const [, contentType, b64] = match;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const storageId = await ctx.storage.store(
    new Blob([bytes], { type: contentType || "image/png" }),
  );
  const url = await ctx.storage.getUrl(storageId);
  if (!url) {
    throw new Error("Failed to store generated image");
  }
  return url;
}

async function generateImageOutput(fullPrompt: string): Promise<{
  outputUrl: string;
  predictionId?: string;
}> {
  const errors: string[] = [];

  if (hasReplicateToken()) {
    try {
      return await replicateGenerateImage(fullPrompt);
    } catch (replicateErr) {
      const msg =
        replicateErr instanceof Error ? replicateErr.message : String(replicateErr);
      errors.push(`Replicate: ${msg}`);
      console.warn("[media] Replicate image failed:", msg);
    }
  }

  if (getFalApiKey()) {
    try {
      const result = await falGenerateImage({ prompt: fullPrompt });
      return { outputUrl: result.imageUrl, predictionId: result.requestId };
    } catch (falErr) {
      const msg = falErr instanceof Error ? falErr.message : String(falErr);
      errors.push(`fal.ai: ${msg}`);
      console.warn("[media] fal.ai image failed:", msg);
    }
  }

  if (hasOpenAiImageKey()) {
    try {
      const outputUrl = await openaiGenerateImage(fullPrompt);
      return { outputUrl };
    } catch (openaiErr) {
      const msg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);
      errors.push(`OpenAI: ${msg}`);
      console.warn("[media] OpenAI image failed:", msg);
    }
  }

  if (errors.length === 0) {
    throw new Error(
      "No image provider configured (set REPLICATE_API_TOKEN, FAL_KEY, or OPENAI_API_KEY in Convex)",
    );
  }

  throw new Error(
    `Image generation failed (${errors.length} provider(s) tried). ${errors.join(" | ")}`,
  );
}

async function generateVideoOutput(fullPrompt: string): Promise<{
  outputUrl: string;
  predictionId?: string;
}> {
  if (hasReplicateToken()) {
    try {
      return await replicateGenerateVideo(fullPrompt);
    } catch (replicateErr) {
      if (!getFalApiKey()) throw replicateErr;
      console.warn(
        "[media] Replicate video failed, falling back to fal.ai:",
        replicateErr instanceof Error ? replicateErr.message : replicateErr,
      );
    }
  }

  if (getFalApiKey()) {
    // fal video models are image-to-video; generate a still first when needed.
    const image = await falGenerateImage({ prompt: fullPrompt });
    const result = await falGenerateVideo({
      prompt: fullPrompt,
      image_url: image.imageUrl,
    });
    return { outputUrl: result.videoUrl, predictionId: result.requestId };
  }

  throw new Error(
    "No video provider configured (set REPLICATE_API_TOKEN or FAL_KEY in Convex)",
  );
}

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

    let creditsDeducted = false;
    try {
      await ctx.runMutation(api.credits.deductCredits, {
        userId: args.userId,
        action: "image",
        reference: String(jobId),
        metadata: JSON.stringify({ category: args.category }),
      });
      creditsDeducted = true;

      const result = await generateImageOutput(fullPrompt);
      const outputUrl = await persistMediaUrl(ctx, result.outputUrl);
      await ctx.runMutation(internal.media.finishJob, {
        jobId,
        status: "succeeded",
        outputUrl,
        replicatePredictionId: result.predictionId,
      });

      return { jobId, outputUrl };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Image generation failed";
      if (creditsDeducted) {
        await refundMediaCredits(ctx, args.userId, "image", String(jobId), message);
      }
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

    let creditsDeducted = false;
    try {
      await ctx.runMutation(api.credits.deductCredits, {
        userId: args.userId,
        action: "video",
        reference: String(jobId),
        metadata: JSON.stringify({ category: args.category }),
      });
      creditsDeducted = true;

      const result = await generateVideoOutput(fullPrompt);
      await ctx.runMutation(internal.media.finishJob, {
        jobId,
        status: "succeeded",
        outputUrl: result.outputUrl,
        replicatePredictionId: result.predictionId,
      });

      return { jobId, outputUrl: result.outputUrl };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Video generation failed";
      if (creditsDeducted) {
        await refundMediaCredits(ctx, args.userId, "video", String(jobId), message);
      }
      await ctx.runMutation(internal.media.finishJob, {
        jobId,
        status: "failed",
        errorMessage: message,
      });
      throw e;
    }
  },
});
