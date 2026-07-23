import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import {
  feedbackPriorityValidator,
  feedbackSubmissionStatusValidator,
  feedbackSubmissionTypeValidator,
} from "./schema";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { RateLimitError } from "./securityErrors";
import { isPhase5FlagEnabled } from "./phase5Controls";

const MAX_BODY = 4000;
const MAX_SCREENSHOT = 500_000;
const FEEDBACK_RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_FEEDBACK_PER_HOUR = 8;

const PHASE5_ONLY_TYPES = new Set(["usability", "content_report"]);

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function inferPriority(
  type: string,
  rating?: number
): "low" | "normal" | "high" | "critical" {
  if (type === "bug" || type === "content_report") return "high";
  if (type === "incorrect_info") return "high";
  if (type === "ai_rating" && typeof rating === "number" && rating <= 2) {
    return "high";
  }
  if (type === "feature" || type === "usability") return "normal";
  return "low";
}

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

    if (PHASE5_ONLY_TYPES.has(args.type)) {
      if (!(await isPhase5FlagEnabled(ctx, "phase5.feedback"))) {
        throw new Error("That feedback category is not available yet.");
      }
    }

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
    const priority = inferPriority(args.type, args.rating);
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
      priority,
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
    await ensureAdminAccess(args);
    const limit = args.limit ?? 50;
    const rows = await ctx.db
      .query("userFeedbackSubmissions")
      .withIndex("by_status", (q) => q.eq("status", args.status ?? "open"))
      .order("desc")
      .take(limit);
    return rows;
  },
});

/**
 * Phase 5 admin dashboard: priority-ranked queue + status counts.
 * Safe to call anytime — does not expose internal stack traces to clients.
 */
export const listFeedbackDashboardAdmin = query({
  args: {
    ...adminCredentialArgs,
    status: v.optional(feedbackSubmissionStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const limit = Math.min(100, args.limit ?? 60);
    const status = args.status ?? "open";
    const rows = await ctx.db
      .query("userFeedbackSubmissions")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .take(limit);

    const ranked = [...rows].sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority ?? inferPriority(a.type, a.rating)] ?? 2;
      const pb = PRIORITY_RANK[b.priority ?? inferPriority(b.type, b.rating)] ?? 2;
      if (pa !== pb) return pa - pb;
      return b.createdAt - a.createdAt;
    });

    const open = await ctx.db
      .query("userFeedbackSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .take(100);
    const reviewing = await ctx.db
      .query("userFeedbackSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "reviewing"))
      .take(100);
    const resolved = await ctx.db
      .query("userFeedbackSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "resolved"))
      .take(50);

    return {
      items: ranked.map((r) => ({
        _id: r._id,
        type: r.type,
        status: r.status,
        title: r.title,
        body: r.body.slice(0, 280),
        rating: r.rating,
        priority: r.priority ?? inferPriority(r.type, r.rating),
        adminNote: r.adminNote,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        // Never expose raw user email internals beyond ops need — keep id only.
        hasUser: Boolean(r.userId),
      })),
      counts: {
        open: open.length,
        reviewing: reviewing.length,
        resolved: resolved.length,
      },
      phase5FeedbackEnabled: await isPhase5FlagEnabled(ctx, "phase5.feedback"),
    };
  },
});

export const updateFeedbackStatus = mutation({
  args: {
    ...adminCredentialArgs,
    feedbackId: v.id("userFeedbackSubmissions"),
    status: feedbackSubmissionStatusValidator,
    adminNote: v.optional(v.string()),
    priority: v.optional(feedbackPriorityValidator),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const row = await ctx.db.get(args.feedbackId);
    if (!row) throw new Error("Not found");
    await ctx.db.patch(args.feedbackId, {
      status: args.status,
      adminNote: args.adminNote?.slice(0, 500),
      ...(args.priority ? { priority: args.priority } : {}),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});
