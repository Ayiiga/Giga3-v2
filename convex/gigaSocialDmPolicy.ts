/**
 * Pure policy helpers for GigaSocial DM foundation (Phase 2C).
 * Keep free of Convex runtime so vitest can cover flag/authz edges.
 */

import { ForbiddenError, ValidationError } from "./securityErrors";

/** Max body length for text DMs (v1). */
export const SOCIAL_DM_MAX_BODY_CHARS = 2000;
export const SOCIAL_DM_MAX_PREVIEW_CHARS = 140;
export const SOCIAL_DM_THREAD_PAGE_MAX = 40;
export const SOCIAL_DM_MESSAGE_PAGE_MAX = 50;

/**
 * Server rollout gate. Default OFF.
 * Prefer Convex env `GIGASOCIAL_DM_ENABLED=true` for production enablement.
 * Falls back to `NEXT_PUBLIC_GIGASOCIAL_DM` for local parity only.
 * This is rollout control — not a substitute for session authz.
 */
export function isGigaSocialDmEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const server = env.GIGASOCIAL_DM_ENABLED;
  if (server !== undefined && server !== "") {
    return server === "true" || server === "1";
  }
  const pub = env.NEXT_PUBLIC_GIGASOCIAL_DM;
  if (pub !== undefined && pub !== "") {
    return pub === "true" || pub === "1";
  }
  return false;
}

export function assertGigaSocialDmEnabled(
  env: NodeJS.ProcessEnv = process.env
): void {
  if (!isGigaSocialDmEnabled(env)) {
    throw new ForbiddenError("Direct messaging is not enabled.");
  }
}

/** Stable pair ordering for socialDmThreads.by_pair. */
export function normalizeDmParticipantPair(
  userIdA: string,
  userIdB: string
): { participantAId: string; participantBId: string } {
  const a = userIdA.trim().toLowerCase();
  const b = userIdB.trim().toLowerCase();
  if (!a || !b) throw new ValidationError("Both participants are required.");
  if (a === b) throw new ValidationError("Cannot message yourself.");
  return a < b
    ? { participantAId: a, participantBId: b }
    : { participantAId: b, participantBId: a };
}

export function isDmThreadParticipant(
  thread: { participantAId: string; participantBId: string },
  userId: string
): boolean {
  const id = userId.trim().toLowerCase();
  return (
    thread.participantAId.trim().toLowerCase() === id ||
    thread.participantBId.trim().toLowerCase() === id
  );
}

export function assertDmThreadParticipant(
  thread: { participantAId: string; participantBId: string },
  userId: string
): void {
  if (!isDmThreadParticipant(thread, userId)) {
    throw new ForbiddenError("Not a participant in this conversation.");
  }
}

export function sanitizeDmBody(raw: string): string {
  const body = raw.replace(/\u0000/g, "").trim();
  if (!body) throw new ValidationError("Message body is required.");
  if (body.length > SOCIAL_DM_MAX_BODY_CHARS) {
    throw new ValidationError(
      `Message must be at most ${SOCIAL_DM_MAX_BODY_CHARS} characters.`
    );
  }
  return body;
}

export function dmPreviewFromBody(body: string): string {
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= SOCIAL_DM_MAX_PREVIEW_CHARS) return clean;
  return `${clean.slice(0, SOCIAL_DM_MAX_PREVIEW_CHARS - 1)}…`;
}

export function clampDmThreadLimit(limit?: number): number {
  const n = limit === undefined ? 20 : Number(limit);
  if (!Number.isFinite(n)) return 20;
  return Math.min(Math.max(1, Math.floor(n)), SOCIAL_DM_THREAD_PAGE_MAX);
}

export function clampDmMessageLimit(limit?: number): number {
  const n = limit === undefined ? 30 : Number(limit);
  if (!Number.isFinite(n)) return 30;
  return Math.min(Math.max(1, Math.floor(n)), SOCIAL_DM_MESSAGE_PAGE_MAX);
}

export function sanitizeDmReportReason(raw: string): string {
  const reason = raw.trim().slice(0, 80);
  if (!reason) throw new ValidationError("Report reason is required.");
  return reason;
}

/** Shared Forbidden copy when a DM block is in force either direction. */
export const DM_BLOCKED_MESSAGE = "You cannot message this user.";

/**
 * M1 — After a block either way, participants must not receive thread list
 * entries or message bodies. Records stay in the database (no auto-delete).
 */
export function shouldHideDmThreadForBlock(blockedEitherWay: boolean): boolean {
  return blockedEitherWay;
}

export function assertDmNotBlocked(blockedEitherWay: boolean): void {
  if (blockedEitherWay) {
    throw new ForbiddenError(DM_BLOCKED_MESSAGE);
  }
}

export type DmRequestStatus = "open" | "accepted" | "declined";

/**
 * Soft decline state machine (no auto-block).
 * - Recipient-only transitions open → declined (idempotent if already declined).
 * - Declined cannot be accepted.
 * - A later send may reopen declined → open with a new initiator (handler-owned).
 */
export function assertCanDeclineDmRequest(args: {
  requestStatus: DmRequestStatus;
  initiatedBy: string;
  actorUserId: string;
}): { alreadyDeclined: boolean } {
  const actor = args.actorUserId.trim().toLowerCase();
  const initiator = args.initiatedBy.trim().toLowerCase();
  if (actor === initiator) {
    throw new ForbiddenError("Only the recipient can decline this request.");
  }
  if (args.requestStatus === "accepted") {
    throw new ForbiddenError("This conversation is already accepted.");
  }
  if (args.requestStatus === "declined") {
    return { alreadyDeclined: true };
  }
  return { alreadyDeclined: false };
}

export function assertCanAcceptDmRequest(args: {
  requestStatus: DmRequestStatus;
  initiatedBy: string;
  actorUserId: string;
}): { alreadyAccepted: boolean } {
  const actor = args.actorUserId.trim().toLowerCase();
  const initiator = args.initiatedBy.trim().toLowerCase();
  if (actor === initiator) {
    throw new ForbiddenError("Only the recipient can accept this request.");
  }
  if (args.requestStatus === "accepted") {
    return { alreadyAccepted: true };
  }
  if (args.requestStatus === "declined") {
    throw new ForbiddenError("This conversation was declined.");
  }
  return { alreadyAccepted: false };
}

/**
 * M2 — Deterministic newest-first pagination using createdAt cursor.
 * Simulates index range: threadId eq + optional createdAt < cursor, then take(limit+1)
 * to detect hasMore without a false empty trailing page.
 * Does not scan the full conversation beyond one bounded window.
 */
export function paginateDmMessagesByCreatedAtDesc<
  T extends { messageId: string; createdAt: number },
>(
  newestFirst: T[],
  opts: { cursor?: number; limit: number }
): { page: T[]; nextCursor: number | null } {
  const limit = clampDmMessageLimit(opts.limit);
  const filtered =
    opts.cursor === undefined
      ? newestFirst
      : newestFirst.filter((m) => m.createdAt < opts.cursor!);
  const window = filtered.slice(0, limit + 1);
  const hasMore = window.length > limit;
  const page = hasMore ? window.slice(0, limit) : window;
  const nextCursor = hasMore ? (page[page.length - 1]?.createdAt ?? null) : null;
  return { page, nextCursor };
}

/** Build Convex index range args for listThreadMessages (documentation + tests). */
export function dmMessageIndexRange(
  threadId: string,
  cursor?: number
): { threadId: string; createdAtLt?: number } {
  if (cursor === undefined) return { threadId };
  if (!Number.isFinite(cursor)) {
    throw new ValidationError("Invalid message cursor.");
  }
  return { threadId, createdAtLt: cursor };
}
