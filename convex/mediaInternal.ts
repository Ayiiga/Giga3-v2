import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createMediaJob = internalMutation({
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

export const completeMediaJob = internalMutation({
  args: {
    jobId: v.id("mediaJobs"),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
    outputUrl: v.optional(v.string()),
    replicatePredictionId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    await ctx.db.patch(args.jobId, {
      status: args.status,
      outputUrl: args.outputUrl,
      replicatePredictionId: args.replicatePredictionId,
      errorMessage: args.errorMessage,
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
