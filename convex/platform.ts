import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { normalizeUserId } from "./userIds";
import { SEGMENT_RECAP_PREFIX } from "./chatSegmentation";

function userOwnsConversation(
  conv: { userId: string } | null,
  userId: string
): boolean {
  if (!conv) return false;
  const normalized = normalizeUserId(userId);
  return (
    conv.userId === normalized ||
    conv.userId === userId.trim() ||
    conv.userId === userId
  );
}

export const appendMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    metadataJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: normalizeUserId(args.userId),
      role: args.role,
      content: args.content,
      metadataJson: args.metadataJson,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
    if (args.role === "user" || args.role === "assistant") {
      await ctx.runMutation(internal.platformStatsRecorder.recordMessageInternal, {
        role: args.role,
      });
    }
  },
});

export const listConversationMessagesInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    return rows
      .filter((m) => m.role !== "system")
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const listSegmentRecapInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    const recap = rows.find(
      (m) => m.role === "system" && m.content.startsWith(SEGMENT_RECAP_PREFIX)
    );
    if (!recap) return null;
    return recap.content.slice(SEGMENT_RECAP_PREFIX.length);
  },
});

/**
 * Everything the reply worker needs in ONE round trip: job, conversation, the
 * most recent non-system messages (bounded — the engine trims to
 * CHAT_MAX_HISTORY_TURNS anyway), the segment recap and the user. Replaces five
 * sequential action→query hops that each cost a network round trip.
 */
export const loadReplyContextInternal = internalQuery({
  args: { jobId: v.id("chatReplyJobs"), historyLimit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const conversation = await ctx.db.get(job.conversationId);
    if (!conversation) return { job, conversation: null, history: [], segmentRecap: null, user: null };

    const limit = Math.max(4, Math.min(args.historyLimit ?? 40, 200));
    // Newest first via the index, then restore chronological order.
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", job.conversationId))
      .order("desc")
      .take(limit + 8);
    const history = recent
      .filter((m) => m.role !== "system")
      .slice(0, limit)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((m) => ({ _id: m._id, role: m.role, content: m.content, createdAt: m.createdAt }));

    // The recap is the oldest system message; it is rare, so only scan when the
    // conversation was segmented (flagged on the conversation) or short.
    let segmentRecap: string | null = null;
    const recapCandidate = recent.find(
      (m) => m.role === "system" && m.content.startsWith(SEGMENT_RECAP_PREFIX)
    );
    if (recapCandidate) {
      segmentRecap = recapCandidate.content.slice(SEGMENT_RECAP_PREFIX.length);
    } else if (recent.length > limit) {
      const first = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", job.conversationId))
        .order("asc")
        .take(3);
      const recap = first.find(
        (m) => m.role === "system" && m.content.startsWith(SEGMENT_RECAP_PREFIX)
      );
      if (recap) segmentRecap = recap.content.slice(SEGMENT_RECAP_PREFIX.length);
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", job.userId))
      .first();

    return { job, conversation, history, segmentRecap, user };
  },
});

/**
 * Persist the assistant reply unless one already exists for this job — checked
 * and written in the same transaction, so a recovered/duplicate worker can never
 * double-post. Returns whether the reply was written.
 */
export const appendAssistantReplyIfMissing = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    content: v.string(),
    since: v.number(),
    metadataJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(6);
    const duplicate = latest.some((m) => m.role === "assistant" && m.createdAt >= args.since);
    if (duplicate) return { written: false as const };
    const now = Date.now();
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: normalizeUserId(args.userId),
      role: "assistant",
      content: args.content,
      metadataJson: args.metadataJson,
      createdAt: now,
    });
    await ctx.db.patch(args.conversationId, { updatedAt: now });
    // Stats are not on the user's critical path — schedule instead of awaiting.
    await ctx.scheduler.runAfter(0, internal.platformStatsRecorder.recordMessageInternal, {
      role: "assistant",
    });
    return { written: true as const };
  },
});

export const getConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const updateConversationTitleInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title.slice(0, 120),
      updatedAt: Date.now(),
    });
  },
});

/** Delete a message and every later message in the conversation (for regenerate). */
export const removeMessagesFrom = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    fromMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!userOwnsConversation(conv, args.userId)) {
      throw new Error("Conversation not found");
    }
    const fromMsg = await ctx.db.get(args.fromMessageId);
    if (!fromMsg || fromMsg.conversationId !== args.conversationId) {
      throw new Error("Message not found");
    }
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    const toDelete = rows.filter((m) => m.createdAt >= fromMsg.createdAt);
    for (const row of toDelete) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
  },
});
