/**
 * GigaSocial direct messaging foundation (Phase 2C).
 * Schema-backed, session-authenticated stubs. Default feature flag OFF.
 * No UI. No public listing of private messages.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";
import { ForbiddenError, ValidationError } from "./securityErrors";
import {
  assertDmThreadParticipant,
  assertGigaSocialDmEnabled,
  clampDmMessageLimit,
  clampDmThreadLimit,
  dmPreviewFromBody,
  isDmThreadParticipant,
  normalizeDmParticipantPair,
  sanitizeDmBody,
  sanitizeDmReportReason,
} from "./gigaSocialDmPolicy";
import { consumeSocialWriteRateLimit } from "./socialRateLimit";
import { normalizeUserId } from "./userIds";

type ThreadDoc = Doc<"socialDmThreads">;

async function requireDmUserId(
  sessionToken: string,
  ctx: Parameters<typeof requireSession>[1]
): Promise<string> {
  const email = await requireSession(sessionToken, ctx);
  return normalizeUserId(email);
}

function otherParticipant(thread: ThreadDoc, userId: string): string {
  const id = normalizeUserId(userId);
  return normalizeUserId(thread.participantAId) === id
    ? thread.participantBId
    : thread.participantAId;
}

async function getThreadOrThrow(
  ctx: { db: any },
  threadId: Id<"socialDmThreads">
): Promise<ThreadDoc> {
  const thread = await ctx.db.get(threadId);
  if (!thread) throw new ValidationError("Conversation not found.");
  return thread;
}

async function findBlockEitherWay(
  ctx: { db: any },
  userA: string,
  userB: string
) {
  const a = userA.trim().toLowerCase();
  const b = userB.trim().toLowerCase();
  const forward = await ctx.db
    .query("socialDmBlocks")
    .withIndex("by_pair", (q: any) => q.eq("blockerId", a).eq("blockedId", b))
    .first();
  if (forward) return forward;
  return await ctx.db
    .query("socialDmBlocks")
    .withIndex("by_pair", (q: any) => q.eq("blockerId", b).eq("blockedId", a))
    .first();
}

function toPublicThread(thread: ThreadDoc, viewerId: string) {
  return {
    threadId: thread._id,
    otherUserId: otherParticipant(thread, viewerId),
    requestStatus: thread.requestStatus,
    initiatedByMe: normalizeUserId(thread.initiatedBy) === normalizeUserId(viewerId),
    lastMessageAt: thread.lastMessageAt ?? null,
    lastMessagePreview: thread.lastMessagePreview ?? null,
    updatedAt: thread.updatedAt,
    createdAt: thread.createdAt,
  };
}

/**
 * List DM threads for the authenticated user (empty until messages exist).
 * Flag-gated; session required.
 */
export const listMyThreads = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    const cap = clampDmThreadLimit(args.limit);

    const [asA, asB] = await Promise.all([
      ctx.db
        .query("socialDmThreads")
        .withIndex("by_participantA_updated", (q) => q.eq("participantAId", userId))
        .order("desc")
        .take(cap),
      ctx.db
        .query("socialDmThreads")
        .withIndex("by_participantB_updated", (q) => q.eq("participantBId", userId))
        .order("desc")
        .take(cap),
    ]);

    const merged = [...asA, ...asB]
      .filter((t) => isDmThreadParticipant(t, userId))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, cap);

    return {
      threads: merged.map((t) => toPublicThread(t, userId)),
    };
  },
});

/**
 * List messages in a thread. Participant-only; never returns another user's threads.
 */
export const listThreadMessages = query({
  args: {
    sessionToken: v.string(),
    threadId: v.id("socialDmThreads"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    const thread = await getThreadOrThrow(ctx, args.threadId);
    assertDmThreadParticipant(thread, userId);

    const cap = clampDmMessageLimit(args.limit);
    let rows = await ctx.db
      .query("socialDmMessages")
      .withIndex("by_thread_created", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(cap + 8);

    if (args.cursor !== undefined) {
      rows = rows.filter((m) => m.createdAt < args.cursor!);
    }
    const slice = rows.slice(0, cap);

    return {
      messages: slice.map((m) => ({
        messageId: m._id,
        senderId: m.senderId,
        body: m.body,
        deliveryState: m.deliveryState,
        createdAt: m.createdAt,
        mine: normalizeUserId(m.senderId) === userId,
      })),
      nextCursor:
        slice.length === cap ? slice[slice.length - 1]?.createdAt ?? null : null,
    };
  },
});

/**
 * Send a text DM (or open a message request). Idempotent when clientId is set.
 */
export const sendMessage = mutation({
  args: {
    sessionToken: v.string(),
    recipientUserId: v.string(),
    body: v.string(),
    clientId: v.optional(v.string()),
    threadId: v.optional(v.id("socialDmThreads")),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    await consumeSocialWriteRateLimit(ctx, userId, "dm_send");

    const body = sanitizeDmBody(args.body);
    const clientId = args.clientId?.trim().slice(0, 64) || undefined;
    const now = Date.now();

    let thread: ThreadDoc | null = null;
    if (args.threadId) {
      thread = await getThreadOrThrow(ctx, args.threadId);
      assertDmThreadParticipant(thread, userId);
    } else {
      const pair = normalizeDmParticipantPair(userId, args.recipientUserId);
      thread = await ctx.db
        .query("socialDmThreads")
        .withIndex("by_pair", (q) =>
          q.eq("participantAId", pair.participantAId).eq("participantBId", pair.participantBId)
        )
        .first();
      if (!thread) {
        const blocked = await findBlockEitherWay(
          ctx,
          userId,
          args.recipientUserId
        );
        if (blocked) {
          throw new ForbiddenError("You cannot message this user.");
        }
        // Foundation: new threads start as message requests until accept.
        const threadId = await ctx.db.insert("socialDmThreads", {
          participantAId: pair.participantAId,
          participantBId: pair.participantBId,
          initiatedBy: userId,
          requestStatus: "open",
          lastMessageAt: now,
          lastMessagePreview: dmPreviewFromBody(body),
          createdAt: now,
          updatedAt: now,
        });
        thread = await ctx.db.get(threadId);
      }
    }

    if (!thread) throw new ValidationError("Conversation not found.");
    assertDmThreadParticipant(thread, userId);

    if (thread.requestStatus === "declined") {
      throw new ForbiddenError("This conversation was declined.");
    }

    const blocked = await findBlockEitherWay(
      ctx,
      thread.participantAId,
      thread.participantBId
    );
    if (blocked) throw new ForbiddenError("You cannot message this user.");

    if (clientId) {
      const existing = await ctx.db
        .query("socialDmMessages")
        .withIndex("by_thread_client", (q) =>
          q.eq("threadId", thread!._id).eq("clientId", clientId)
        )
        .first();
      if (existing) {
        return {
          threadId: thread._id,
          messageId: existing._id,
          alreadySent: true as const,
          requestStatus: thread.requestStatus,
        };
      }
    }

    const messageId = await ctx.db.insert("socialDmMessages", {
      threadId: thread._id,
      senderId: userId,
      body,
      clientId,
      deliveryState: "sent",
      createdAt: now,
    });

    await ctx.db.patch(thread._id, {
      lastMessageAt: now,
      lastMessagePreview: dmPreviewFromBody(body),
      updatedAt: now,
    });

    return {
      threadId: thread._id,
      messageId,
      alreadySent: false as const,
      requestStatus: thread.requestStatus,
    };
  },
});

/** Accept an open message request (recipient only). */
export const acceptRequest = mutation({
  args: {
    sessionToken: v.string(),
    threadId: v.id("socialDmThreads"),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    const thread = await getThreadOrThrow(ctx, args.threadId);
    assertDmThreadParticipant(thread, userId);

    if (normalizeUserId(thread.initiatedBy) === userId) {
      throw new ForbiddenError("Only the recipient can accept this request.");
    }
    if (thread.requestStatus === "accepted") {
      return { ok: true as const, requestStatus: "accepted" as const };
    }
    if (thread.requestStatus === "declined") {
      throw new ForbiddenError("This conversation was declined.");
    }

    await ctx.db.patch(thread._id, {
      requestStatus: "accepted",
      updatedAt: Date.now(),
    });
    return { ok: true as const, requestStatus: "accepted" as const };
  },
});

/** Block a user for DMs (session user is blocker). */
export const blockUser = mutation({
  args: {
    sessionToken: v.string(),
    blockedUserId: v.string(),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    const blockedId = normalizeUserId(args.blockedUserId);
    if (!blockedId) throw new ValidationError("User to block is required.");
    if (blockedId === userId) {
      throw new ValidationError("Cannot block yourself.");
    }
    const pair = normalizeDmParticipantPair(userId, blockedId);

    const existing = await ctx.db
      .query("socialDmBlocks")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", userId).eq("blockedId", blockedId)
      )
      .first();
    if (existing) return { ok: true as const, alreadyBlocked: true as const };

    await ctx.db.insert("socialDmBlocks", {
      blockerId: userId,
      blockedId,
      createdAt: Date.now(),
    });

    // Decline any open request between the pair.
    const thread = await ctx.db
      .query("socialDmThreads")
      .withIndex("by_pair", (q) =>
        q.eq("participantAId", pair.participantAId).eq("participantBId", pair.participantBId)
      )
      .first();
    if (thread && thread.requestStatus === "open") {
      await ctx.db.patch(thread._id, {
        requestStatus: "declined",
        updatedAt: Date.now(),
      });
    }

    return { ok: true as const, alreadyBlocked: false as const };
  },
});

/** Report a thread or message (no public listing). */
export const reportMessage = mutation({
  args: {
    sessionToken: v.string(),
    reason: v.string(),
    details: v.optional(v.string()),
    threadId: v.optional(v.id("socialDmThreads")),
    messageId: v.optional(v.id("socialDmMessages")),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    const reason = sanitizeDmReportReason(args.reason);

    if (!args.threadId && !args.messageId) {
      throw new ValidationError("threadId or messageId is required.");
    }

    let threadId = args.threadId;
    if (args.messageId) {
      const message = await ctx.db.get(args.messageId);
      if (!message) throw new ValidationError("Message not found.");
      threadId = message.threadId;
    }
    if (!threadId) throw new ValidationError("Conversation not found.");

    const thread = await getThreadOrThrow(ctx, threadId);
    assertDmThreadParticipant(thread, userId);

    const reportId = await ctx.db.insert("socialDmReports", {
      reporterId: userId,
      threadId,
      messageId: args.messageId,
      reason,
      details: args.details?.trim().slice(0, 500) || undefined,
      status: "open",
      createdAt: Date.now(),
    });

    return { ok: true as const, reportId };
  },
});

/** Probe for clients — never leaks message content. */
export const getDmFoundationStatus = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const enabled = (() => {
      try {
        assertGigaSocialDmEnabled();
        return true;
      } catch {
        return false;
      }
    })();

    let authenticated = false;
    if (args.sessionToken?.trim()) {
      try {
        await requireDmUserId(args.sessionToken, ctx);
        authenticated = true;
      } catch {
        authenticated = false;
      }
    }

    return {
      enabled,
      authenticated,
      uiAvailable: false,
      note: "DM foundation is server-only; UI ships in a later phase.",
    };
  },
});
