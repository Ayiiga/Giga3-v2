import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const createMediaJob = internalMutation({
  args: {
    userId: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    category: v.string(),
    prompt: v.string(),
    creditsCharged: v.number(),
    sourceImageUrl: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    aspectRatio: v.optional(v.string()),
    resolution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("mediaJobs", {
      userId: args.userId,
      mediaType: args.mediaType,
      category: args.category,
      prompt: args.prompt,
      status: "processing",
      creditsCharged: args.creditsCharged,
      sourceImageUrl: args.sourceImageUrl,
      durationSec: args.durationSec,
      aspectRatio: args.aspectRatio,
      resolution: args.resolution,
      progressStage: "queued",
      progressLabel: "Queued",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getMediaJobInternal = internalQuery({
  args: { jobId: v.id("mediaJobs") },
  handler: async (ctx, args) => await ctx.db.get(args.jobId),
});

/** Live progress written by the worker; ignored once the job is terminal. */
export const updateMediaJobProgress = internalMutation({
  args: {
    jobId: v.id("mediaJobs"),
    stage: v.string(),
    label: v.string(),
    provider: v.optional(v.string()),
    externalId: v.optional(v.string()),
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "processing") return;
    await ctx.db.patch(args.jobId, {
      progressStage: args.stage,
      progressLabel: args.label,
      ...(args.provider ? { provider: args.provider } : {}),
      ...(args.externalId ? { externalId: args.externalId } : {}),
      ...(args.modelId ? { modelId: args.modelId } : {}),
      ...(job.startedAt ? {} : { startedAt: Date.now() }),
      updatedAt: Date.now(),
    });
  },
});

/** Mark a job charged up-front; used by the async video pipeline. */
export const setMediaJobCharge = internalMutation({
  args: { jobId: v.id("mediaJobs"), creditsCharged: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { creditsCharged: args.creditsCharged, updatedAt: Date.now() });
  },
});

export const completeMediaJob = internalMutation({
  args: {
    jobId: v.id("mediaJobs"),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
    outputUrl: v.optional(v.string()),
    replicatePredictionId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    provider: v.optional(v.string()),
    externalId: v.optional(v.string()),
    modelId: v.optional(v.string()),
    creditsRefunded: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    // Idempotent: a stuck-job sweep and a late worker must not both notify.
    if (job.status === "succeeded" || job.status === "failed") return;

    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: args.status,
      outputUrl: args.outputUrl,
      replicatePredictionId: args.replicatePredictionId,
      errorMessage: args.errorMessage,
      ...(args.provider ? { provider: args.provider } : {}),
      ...(args.externalId ? { externalId: args.externalId } : {}),
      ...(args.modelId ? { modelId: args.modelId } : {}),
      ...(args.creditsRefunded !== undefined ? { creditsRefunded: args.creditsRefunded } : {}),
      progressStage: args.status === "succeeded" ? "done" : "failed",
      progressLabel: args.status === "succeeded" ? "Ready" : args.errorMessage ?? "Failed",
      completedAt: now,
      updatedAt: now,
    });

    if (args.status === "succeeded") {
      const label = job.mediaType === "video" ? "Video" : "Image";
      await ctx.scheduler.runAfter(
        0,
        internal.pushNotificationDispatch.dispatchPushNotification,
        {
          recipientId: job.userId,
          category: "generation",
          title: `${label} generation complete`,
          body: `Your AI ${job.mediaType} is ready to view.`,
          url: "/media/",
          tag: `generation-${args.jobId}`,
          badgeIncrement: 1,
        }
      );

      await ctx.runMutation(internal.platformNotifications.createNotificationInternal, {
        userId: job.userId,
        category: job.mediaType === "video" ? "creator" : "ai_task",
        title: `${label} ready`,
        body: job.prompt.slice(0, 160),
        href: "/media/",
      });
    } else if (args.status === "failed" && args.errorMessage) {
      await ctx.runMutation(internal.platformNotifications.createNotificationInternal, {
        userId: job.userId,
        category: "ai_task",
        title: `${job.mediaType === "video" ? "Video" : "Image"} generation failed`,
        body: args.errorMessage.slice(0, 160),
        href: "/media/",
      });
    }
  },
});

/**
 * Return reserved credits for a failed video job. Idempotent per job via
 * creditsRefunded; returns the amount refunded (0 when nothing to do).
 */
export const refundMediaJobCredits = internalMutation({
  args: { jobId: v.id("mediaJobs"), reason: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return { refunded: 0 };
    if (job.creditsCharged <= 0 || (job.creditsRefunded ?? 0) > 0) return { refunded: 0 };
    await ctx.runMutation(internal.credits.grantCreditsInternal, {
      userId: job.userId,
      credits: job.creditsCharged,
      action: "refund",
      reference: String(args.jobId),
      metadata: JSON.stringify({ source: "media_studio", reason: args.reason }),
    });
    await ctx.db.patch(args.jobId, { creditsRefunded: job.creditsCharged, updatedAt: Date.now() });
    return { refunded: job.creditsCharged };
  },
});

/** Jobs still "processing" past the cutoff — candidates for the stuck-job sweep. */
export const listStuckMediaJobs = internalQuery({
  args: { olderThanMs: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    return await ctx.db
      .query("mediaJobs")
      .withIndex("by_status_created", (q) => q.eq("status", "processing").lt("createdAt", cutoff))
      .take(args.limit ?? 50);
  },
});
