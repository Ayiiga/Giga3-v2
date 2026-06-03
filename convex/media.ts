import { action, internalMutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import {
  buildImagePrompt,
  buildVideoPrompt,
  REPLICATE_IMAGE_MODEL,
  REPLICATE_VIDEO_MODEL,
} from "./mediaCatalog";

async function replicateCreatePrediction(
  model: string,
  input: Record<string, unknown>
): Promise<{ id: string; status: string; output?: unknown; error?: string }> {
  const token = (
    process.env.REPLICATE_API_TOKEN?.trim() ||
    process.env.REPLICATE_API?.trim()
  );
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN is not configured (set REPLICATE_API_TOKEN or REPLICATE_API in Convex)"
    );
  }

  const [owner, name] = model.includes("/")
    ? model.split("/")
    : ["", model];

  const res = await fetch(
    `https://api.replicate.com/v1/models/${owner}/${name}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({ input }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate error: ${text}`);
  }

  return res.json();
}

function extractOutputUrl(output: unknown): string | null {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  if (typeof output === "object" && output !== null && "url" in output) {
    return String((output as { url: string }).url);
  }
  return null;
}

export const listJobs = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("mediaJobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return jobs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  },
});

export const updateJob = internalMutation({
  args: {
    jobId: v.id("mediaJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded"),
      v.literal("failed")
    ),
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
    const { chargedCredits } = await ctx.runMutation(
      api.credits.assertCanGenerateImage,
      { userId: args.userId }
    );

    const jobId = await ctx.runMutation(internal.media.createJob, {
      userId: args.userId,
      mediaType: "image",
      category: args.category,
      prompt: args.prompt,
      creditsCharged: chargedCredits,
    });

    try {
      await ctx.runMutation(internal.media.updateJob, {
        jobId,
        status: "processing",
      });

      const fullPrompt = buildImagePrompt(args.category, args.prompt);
      const prediction = await replicateCreatePrediction(REPLICATE_IMAGE_MODEL, {
        prompt: fullPrompt,
        num_outputs: 1,
      });

      const outputUrl = extractOutputUrl(prediction.output);
      if (!outputUrl && prediction.status !== "succeeded") {
        throw new Error(prediction.error ?? "Image generation failed");
      }

      await ctx.runMutation(internal.media.updateJob, {
        jobId,
        status: outputUrl ? "succeeded" : "failed",
        outputUrl: outputUrl ?? undefined,
        replicatePredictionId: prediction.id,
        errorMessage: outputUrl ? undefined : "No output URL",
      });

      return { jobId, outputUrl, status: outputUrl ? "succeeded" : "failed" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      await ctx.runMutation(internal.media.updateJob, {
        jobId,
        status: "failed",
        errorMessage: msg,
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
    const { chargedCredits } = await ctx.runMutation(
      api.credits.assertCanGenerateVideo,
      { userId: args.userId }
    );

    const jobId = await ctx.runMutation(internal.media.createJob, {
      userId: args.userId,
      mediaType: "video",
      category: args.category,
      prompt: args.prompt,
      creditsCharged: chargedCredits,
    });

    try {
      await ctx.runMutation(internal.media.updateJob, {
        jobId,
        status: "processing",
      });

      const fullPrompt = buildVideoPrompt(args.category, args.prompt);
      const prediction = await replicateCreatePrediction(REPLICATE_VIDEO_MODEL, {
        prompt: fullPrompt,
      });

      const outputUrl = extractOutputUrl(prediction.output);
      await ctx.runMutation(internal.media.updateJob, {
        jobId,
        status: outputUrl ? "succeeded" : "failed",
        outputUrl: outputUrl ?? undefined,
        replicatePredictionId: prediction.id,
        errorMessage: outputUrl ? undefined : prediction.error ?? "No output",
      });

      return { jobId, outputUrl, status: outputUrl ? "succeeded" : "failed" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      await ctx.runMutation(internal.media.updateJob, {
        jobId,
        status: "failed",
        errorMessage: msg,
      });
      throw e;
    }
  },
});

export const createJob = internalMutation({
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
      status: "pending",
      creditsCharged: args.creditsCharged,
      createdAt: Date.now(),
    });
  },
});
