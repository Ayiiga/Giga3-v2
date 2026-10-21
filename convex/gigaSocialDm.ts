/**
 * GigaSocial direct messaging foundation (Phase 2C + 2E hardening).
 * Schema-backed, session-authenticated. Default feature flag OFF.
 * Phase 2E: M1 block enforcement, M2 cursor pagination, soft declineRequest.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";
import { ForbiddenError, ValidationError } from "./securityErrors";
import {
  assertCanAcceptDmRequest,
  assertCanDeclineDmRequest,
  assertDmNotBlocked,
  assertDmThreadParticipant,
  assertGigaSocialDmEnabled,
  clampDmMessageLimit,
  clampDmThreadLimit,
  DM_BLOCKED_MESSAGE,
  dmPreviewFromBody,
  encodeDmMessageCursor,
  encodeDmThreadCursor,
  isDmMessageOlderThanCursor,
  isDmThreadOlderThanCursor,
  isDmThreadParticipant,
  normalizeDmParticipantPair,
  parseDmMessageCursor,
  parseDmThreadCursor,
  sanitizeDmBody,
  sanitizeDmReportReason,
  SOCIAL_DM_MESSAGE_SCAN_MAX,
  SOCIAL_DM_THREAD_SCAN_MAX,
  shouldHideDmThreadForBlock,
} from "./gigaSocialDmPolicy";
import { consumeSocialWriteRateLimit } from "./socialRateLimit";
import { normalizeUserId } from "./userIds";
import { assertChildSafetyFeature } from "./childSafety";

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

async function assertPairNotBlocked(
  ctx: { db: any },
  userA: string,
  userB: string
): Promise<void> {
  const blocked = await findBlockEitherWay(ctx, userA, userB);
  assertDmNotBlocked(Boolean(blocked));
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
 * List DM threads for the authenticated user.
 * M1: excludes threads where a block exists either way with the other participant.
 * Bounded scan + opaque cursor so blocked rows cannot permanently underfill pages.
 */
export const listMyThreads = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
    /** Opaque `${updatedAt}:${threadId}` — exclusive (older) compound cursor. */
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    const cap = clampDmThreadLimit(args.limit);
    const threadCursor = parseDmThreadCursor(args.cursor);
    const scanCap = SOCIAL_DM_THREAD_SCAN_MAX;

    const [asA, asB] = await Promise.all([
      ctx.db
        .query("socialDmThreads")
        .withIndex("by_participantA_updated", (q) => {
          const base = q.eq("participantAId", userId);
          if (!threadCursor) return base;
          return base.lte("updatedAt", threadCursor.updatedAt);
        })
        .order("desc")
        .take(scanCap),
      ctx.db
        .query("socialDmThreads")
        .withIndex("by_participantB_updated", (q) => {
          const base = q.eq("participantBId", userId);
          if (!threadCursor) return base;
          return base.lte("updatedAt", threadCursor.updatedAt);
        })
        .order("desc")
        .take(scanCap),
    ]);

    const seen = new Set<string>();
    const merged = [...asA, ...asB]
      .filter((t) => {
        if (seen.has(t._id)) return false;
        seen.add(t._id);
        return isDmThreadParticipant(t, userId);
      })
      .sort(
        (a, b) =>
          b.updatedAt - a.updatedAt ||
          (a._id < b._id ? 1 : a._id > b._id ? -1 : 0)
      );

    const afterCursor = threadCursor
      ? merged.filter((t) =>
          isDmThreadOlderThanCursor(
            { updatedAt: t.updatedAt, threadId: t._id },
            threadCursor
          )
        )
      : merged;

    const visible: ThreadDoc[] = [];
    for (const thread of afterCursor) {
      if (visible.length >= cap) break;
      const other = otherParticipant(thread, userId);
      const blocked = await findBlockEitherWay(ctx, userId, other);
      if (shouldHideDmThreadForBlock(Boolean(blocked))) continue;
      visible.push(thread);
    }

    const scanHitCap = asA.length === scanCap || asB.length === scanCap;
    const hasMore =
      visible.length === cap &&
      (afterCursor.length > visible.length || scanHitCap);

    return {
      threads: visible.map((t) => toPublicThread(t, userId)),
      nextCursor:
        hasMore && visible.length > 0
          ? encodeDmThreadCursor({
              updatedAt: visible[visible.length - 1]!.updatedAt,
              threadId: visible[visible.length - 1]!._id,
            })
          : null,
    };
  },
});

/**
 * Fetch one thread the viewer participates in (deep links / open conversation).
 * M1: returns null when blocked either way (same hide rule as listMyThreads).
 */
export const getThread = query({
  args: {
    sessionToken: v.string(),
    threadId: v.id("socialDmThreads"),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread || !isDmThreadParticipant(thread, userId)) {
      return null;
    }
    const other = otherParticipant(thread, userId);
    const blocked = await findBlockEitherWay(ctx, userId, other);
    if (shouldHideDmThreadForBlock(Boolean(blocked))) {
      return null;
    }
    return toPublicThread(thread, userId);
  },
});

/**
 * List messages in a thread. Participant-only.
 * M1: Forbidden when blocked either way (no bodies returned).
 * M2: Compound cursor (createdAt, messageId) — no skips on timestamp ties.
 */
export const listThreadMessages = query({
  args: {
    sessionToken: v.string(),
    threadId: v.id("socialDmThreads"),
    limit: v.optional(v.number()),
    /**
     * Compound cursor string `${createdAt}:${messageId}`, or legacy numeric
     * createdAt (exclusive upper bound, same-ts peers excluded).
     */
    cursor: v.optional(v.union(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    const thread = await getThreadOrThrow(ctx, args.threadId);
    assertDmThreadParticipant(thread, userId);
    await assertPairNotBlocked(ctx, thread.participantAId, thread.participantBId);

    const messageCursor = parseDmMessageCursor(args.cursor);
    const cap = clampDmMessageLimit(args.limit);
    const scanCap = Math.min(
      SOCIAL_DM_MESSAGE_SCAN_MAX,
      Math.max(cap + 50, cap * 3)
    );

    const raw = await ctx.db
      .query("socialDmMessages")
      .withIndex("by_thread_created", (q) => {
        const base = q.eq("threadId", args.threadId);
        if (!messageCursor) return base;
        // Inclusive createdAt so same-timestamp peers can be tie-broken by id.
        return base.lte("createdAt", messageCursor.createdAt);
      })
      .order("desc")
      .take(scanCap);

    const sorted = [...raw].sort(
      (a, b) =>
        b.createdAt - a.createdAt ||
        (a._id < b._id ? 1 : a._id > b._id ? -1 : 0)
    );
    const filtered = messageCursor
      ? sorted.filter((m) =>
          isDmMessageOlderThanCursor(
            { messageId: m._id, createdAt: m.createdAt },
            messageCursor
          )
        )
      : sorted;

    const page = filtered.slice(0, cap);
    const hasMore = filtered.length > cap || raw.length === scanCap;

    return {
      messages: page.map((m) => ({
        messageId: m._id,
        senderId: m.senderId,
        body: m.body,
        deliveryState: m.deliveryState,
        createdAt: m.createdAt,
        mine: normalizeUserId(m.senderId) === userId,
      })),
      nextCursor:
        hasMore && page.length > 0
          ? encodeDmMessageCursor({
              createdAt: page[page.length - 1]!.createdAt,
              messageId: page[page.length - 1]!._id,
            })
          : null,
    };
  },
});

/**
 * Send a text DM (or open / re-open a message request). Idempotent when clientId is set.
 * Soft-declined threads re-open as a new request from the current sender (block still wins).
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
    await assertChildSafetyFeature(ctx, userId, "social_dm");
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
      await assertPairNotBlocked(ctx, pair.participantAId, pair.participantBId);
      thread = await ctx.db
        .query("socialDmThreads")
        .withIndex("by_pair", (q) =>
          q.eq("participantAId", pair.participantAId).eq("participantBId", pair.participantBId)
        )
        .first();
      if (!thread) {
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
    await assertPairNotBlocked(ctx, thread.participantAId, thread.participantBId);

    if (thread.requestStatus === "declined") {
      // Soft decline recovery: re-open as a message request from this sender.
      await ctx.db.patch(thread._id, {
        requestStatus: "open",
        initiatedBy: userId,
        updatedAt: now,
      });
      thread = {
        ...thread,
        requestStatus: "open",
        initiatedBy: userId,
        updatedAt: now,
      };
    }

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

/** Accept an open message request (recipient only). Declined requests cannot be accepted. */
export const acceptRequest = mutation({
  args: {
    sessionToken: v.string(),
    threadId: v.id("socialDmThreads"),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    await assertChildSafetyFeature(ctx, userId, "social_dm");
    const thread = await getThreadOrThrow(ctx, args.threadId);
    assertDmThreadParticipant(thread, userId);
    await assertPairNotBlocked(ctx, thread.participantAId, thread.participantBId);

    const gate = assertCanAcceptDmRequest({
      requestStatus: thread.requestStatus,
      initiatedBy: thread.initiatedBy,
      actorUserId: userId,
    });
    if (gate.alreadyAccepted) {
      return { ok: true as const, requestStatus: "accepted" as const };
    }

    await ctx.db.patch(thread._id, {
      requestStatus: "accepted",
      updatedAt: Date.now(),
    });
    return { ok: true as const, requestStatus: "accepted" as const };
  },
});

/**
 * Soft-decline an open message request (recipient only).
 * Does not create a block. Idempotent when already declined.
 */
export const declineRequest = mutation({
  args: {
    sessionToken: v.string(),
    threadId: v.id("socialDmThreads"),
  },
  handler: async (ctx, args) => {
    assertGigaSocialDmEnabled();
    const userId = await requireDmUserId(args.sessionToken, ctx);
    const thread = await getThreadOrThrow(ctx, args.threadId);
    assertDmThreadParticipant(thread, userId);
    // Decline is allowed even when blocked so a recipient can close an open request
    // without needing send access; block itself remains a separate action.

    const gate = assertCanDeclineDmRequest({
      requestStatus: thread.requestStatus,
      initiatedBy: thread.initiatedBy,
      actorUserId: userId,
    });
    if (gate.alreadyDeclined) {
      return {
        ok: true as const,
        requestStatus: "declined" as const,
        alreadyDeclined: true as const,
      };
    }

    await ctx.db.patch(thread._id, {
      requestStatus: "declined",
      updatedAt: Date.now(),
    });
    return {
      ok: true as const,
      requestStatus: "declined" as const,
      alreadyDeclined: false as const,
    };
  },
});

/** Block a user for DMs (session user is blocker). Does not delete history. */
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

    // Decline any open request between the pair (separate from soft declineRequest).
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

/**
 * Report a thread or message (no public listing).
 * Allowed for participants even when blocked so abuse can still be reported
 * without returning other users' private content in this response.
 */
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

/** Probe for clients — never leaks message content or secrets. */
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
      // Keep status free of env values / secrets.
      hardening: {
        blockHidesHistory: true,
        indexRangePagination: true,
        softDeclineRequest: true,
      },
    };
  },
});

// Re-export for tests / clarity that blocked sends use the same copy.
export { DM_BLOCKED_MESSAGE };
