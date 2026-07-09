import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import {
  feedbackSubmissionStatusValidator,
  feedbackSubmissionTypeValidator,
} from "./schema";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { RateLimitError } from "./securityErrors";

const MAX_BODY = 4000;
const MAX_SCREENSHOT = 500_000;
const FEEDBACK_RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_FEEDBACK_PER_HOUR = 8;

async function enforceFeedbackRate(
  ctx: { db: any },
  bucketKey: string
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: any) => q.eq("bucketKey", bucketKey))
    .first();

  if (!existing || now - existing.windowStartMs >= FEEDBACK_RATE_WINDOW_MS) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStartMs: now, count: 1 });
    } else {
      await ctx.db.insert("feedbackRateLimits", {
        bucketKey,
        windowStartMs: now,
        count: 1,
      });
    }
    return;
  }

  if (existing.count >= MAX_FEEDBACK_PER_HOUR) {
    throw new RateLimitError();
  }
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

export const submitFeedback = mutation({
  args: {
    ...sessionArgs,
    type: feedbackSubmissionTypeValidator,
    title: v.string(),
    body: v.string(),
    screenshotDataUrl: v.optional(v.string()),
    messageId: v.optional(v.string()),
    conversationId: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    await enforceFeedbackRate(ctx, `feedback:${email}`);

    const title = args.title.trim().slice(0, 200);
    const body = args.body.trim().slice(0, MAX_BODY);
    if (!title || !body) throw new Error("Title and body required");

    let screenshot: string | undefined;
    if (args.screenshotDataUrl) {
      if (args.screenshotDataUrl.length > MAX_SCREENSHOT) {
        throw new Error("Screenshot too large");
      }
      screenshot = args.screenshotDataUrl;
    }

    const now = Date.now();
    const id = await ctx.db.insert("userFeedbackSubmissions", {
      userId: email,
      type: args.type,
      status: "open",
      title,
      body,
      screenshotDataUrl: screenshot,
      messageId: args.messageId,
      conversationId: args.conversationId,
      rating: args.rating,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const listMyFeedback = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    return await ctx.db
      .query("userFeedbackSubmissions")
      .withIndex("by_user_created", (q) => q.eq("userId", email))
      .order("desc")
      .take(20);
  },
});

export const listFeedbackAdmin = query({
  args: {
    ...adminCredentialArgs,
    status: v.optional(feedbackSubmissionStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    ensureAdminAccess(args);
    const limit = args.limit ?? 50;
    const rows = await ctx.db
      .query("userFeedbackSubmissions")
      .withIndex("by_status", (q) => q.eq("status", args.status ?? "open"))
      .order("desc")
      .take(limit);
    return rows;
  },
});

export const updateFeedbackStatus = mutation({
  args: {
    ...adminCredentialArgs,
    feedbackId: v.id("userFeedbackSubmissions"),
    status: feedbackSubmissionStatusValidator,
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    ensureAdminAccess(args);
    const row = await ctx.db.get(args.feedbackId);
    if (!row) throw new Error("Not found");
    await ctx.db.patch(args.feedbackId, {
      status: args.status,
      adminNote: args.adminNote?.slice(0, 500),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});
