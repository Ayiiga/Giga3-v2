import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";

export const listJobs = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const rows = await ctx.db
      .query("mediaJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    return rows;
  },
});

/** Single job for the composer to follow while a video renders (owner only). */
export const getJob = query({
  args: { ...sessionArgs, jobId: v.id("mediaJobs") },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) return null;
    return {
      _id: job._id,
      status: job.status,
      mediaType: job.mediaType,
      prompt: job.prompt,
      outputUrl: job.outputUrl ?? null,
      errorMessage: job.errorMessage ?? null,
      provider: job.provider ?? null,
      progressStage: job.progressStage ?? null,
      progressLabel: job.progressLabel ?? null,
      creditsCharged: job.creditsCharged,
      creditsRefunded: job.creditsRefunded ?? 0,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt ?? job.createdAt,
    };
  },
});

/** Register a client-combined multi-scene project video in Recent generations (no credits). */
export const registerCombinedProjectVideo = mutation({
  args: {
    ...sessionArgs,
    storageId: v.id("_storage"),
    title: v.string(),
    prompt: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    projectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const outputUrl = await ctx.storage.getUrl(args.storageId);
    if (!outputUrl) {
      throw new Error("Uploaded video is not available.");
    }

    const now = Date.now();
    const title = args.title.trim() || "Video project";
    const prompt = args.prompt?.trim() || title;

    const jobId = await ctx.db.insert("mediaJobs", {
      userId,
      mediaType: "video",
      category: "video_project_combined",
      prompt: `[Combined] ${prompt}`,
      status: "succeeded",
      outputUrl,
      creditsCharged: 0,
      durationSec: args.durationSec,
      aspectRatio: args.aspectRatio,
      progressStage: "done",
      progressLabel: "Ready",
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });

    return { jobId, outputUrl };
  },
});
