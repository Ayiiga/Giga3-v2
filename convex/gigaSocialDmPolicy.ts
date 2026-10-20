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

/** Max docs read from by_thread_created per listThreadMessages call (bounded). */
export const SOCIAL_DM_MESSAGE_SCAN_MAX = 200;

/** Max thread docs scanned per listMyThreads call across both participant indexes. */
export const SOCIAL_DM_THREAD_SCAN_MAX = 120;

export type DmMessageCursor = { createdAt: number; messageId: string };

/**
 * Encode compound message cursor. Format: `${createdAt}:${messageId}`.
 * Legacy numeric cursors are parsed via parseDmMessageCursor.
 */
export function encodeDmMessageCursor(cursor: DmMessageCursor): string {
  return `${cursor.createdAt}:${cursor.messageId}`;
}

/**
 * Parse cursor from clients.
 * - string `createdAt:messageId` → compound
 * - finite number → legacy exclusive createdAt (messageId "")
 */
export function parseDmMessageCursor(
  raw: string | number | undefined
): DmMessageCursor | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) throw new ValidationError("Invalid message cursor.");
    return { createdAt: raw, messageId: "" };
  }
  const s = String(raw);
  // Legacy: pure numeric string
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) throw new ValidationError("Invalid message cursor.");
    return { createdAt: n, messageId: "" };
  }
  const colon = s.indexOf(":");
  if (colon <= 0) throw new ValidationError("Invalid message cursor.");
  const createdAt = Number(s.slice(0, colon));
  const messageId = s.slice(colon + 1);
  if (!Number.isFinite(createdAt) || !messageId) {
    throw new ValidationError("Invalid message cursor.");
  }
  return { createdAt, messageId };
}

/**
 * Newest-first ordering: higher createdAt first; tie-break by messageId desc.
 * Returns true if `m` is strictly older than `cursor` (should appear on later pages).
 */
export function isDmMessageOlderThanCursor(
  m: { messageId: string; createdAt: number },
  cursor: DmMessageCursor
): boolean {
  if (m.createdAt < cursor.createdAt) return true;
  if (m.createdAt > cursor.createdAt) return false;
  // Same timestamp: lexicographically smaller id is "older" in our desc tie-break
  // (we page toward smaller ids). Empty legacy messageId means exclude all same-ts.
  if (cursor.messageId === "") return false;
  return m.messageId < cursor.messageId;
}

/**
 * M2 — Deterministic newest-first pagination with compound (createdAt, messageId) cursor.
 * Does not scan beyond one bounded window of newest-first candidates.
 */
export function paginateDmMessagesByCreatedAtDesc<
  T extends { messageId: string; createdAt: number },
>(
  newestFirst: T[],
  opts: { cursor?: DmMessageCursor | number | string; limit: number }
): { page: T[]; nextCursor: string | null } {
  const limit = clampDmMessageLimit(opts.limit);
  const cursor =
    opts.cursor === undefined
      ? undefined
      : typeof opts.cursor === "object"
        ? opts.cursor
        : parseDmMessageCursor(opts.cursor);
  const filtered = cursor
    ? newestFirst.filter((m) => isDmMessageOlderThanCursor(m, cursor))
    : newestFirst;
  const window = filtered.slice(0, limit + 1);
  const hasMore = window.length > limit;
  const page = hasMore ? window.slice(0, limit) : window;
  const nextCursor =
    hasMore && page.length > 0
      ? encodeDmMessageCursor({
          createdAt: page[page.length - 1]!.createdAt,
          messageId: page[page.length - 1]!.messageId,
        })
      : null;
  return { page, nextCursor };
}

/** @deprecated Use compound cursor helpers; kept for source-compat tests. */
export function dmMessageIndexRange(
  threadId: string,
  cursor?: number
): { threadId: string; createdAtLt?: number; createdAtLte?: number } {
  if (cursor === undefined) return { threadId };
  if (!Number.isFinite(cursor)) {
    throw new ValidationError("Invalid message cursor.");
  }
  return { threadId, createdAtLte: cursor };
}

export type DmThreadCursor = { updatedAt: number; threadId: string };

export function encodeDmThreadCursor(cursor: DmThreadCursor): string {
  return `${cursor.updatedAt}:${cursor.threadId}`;
}

export function parseDmThreadCursor(raw?: string): DmThreadCursor | undefined {
  if (!raw?.trim()) return undefined;
  const colon = raw.indexOf(":");
  if (colon <= 0) throw new ValidationError("Invalid thread cursor.");
  const updatedAt = Number(raw.slice(0, colon));
  const threadId = raw.slice(colon + 1);
  if (!Number.isFinite(updatedAt) || !threadId) {
    throw new ValidationError("Invalid thread cursor.");
  }
  return { updatedAt, threadId };
}

export function isDmThreadOlderThanCursor(
  t: { updatedAt: number; threadId: string },
  cursor: DmThreadCursor
): boolean {
  if (t.updatedAt < cursor.updatedAt) return true;
  if (t.updatedAt > cursor.updatedAt) return false;
  return t.threadId < cursor.threadId;
}

/**
 * Filter/sort thread candidates for listMyThreads (block filtering applied by caller).
 */
export function paginateDmThreadsByUpdatedAtDesc<
  T extends { threadId: string; updatedAt: number },
>(
  newestFirst: T[],
  opts: { cursor?: DmThreadCursor; limit: number; scanHitCap: boolean }
): { page: T[]; nextCursor: string | null } {
  const limit = clampDmThreadLimit(opts.limit);
  const filtered = opts.cursor
    ? newestFirst.filter((t) => isDmThreadOlderThanCursor(t, opts.cursor!))
    : newestFirst;
  const page = filtered.slice(0, limit);
  const hasMore = filtered.length > limit || (opts.scanHitCap && page.length === limit);
  const nextCursor =
    hasMore && page.length > 0
      ? encodeDmThreadCursor({
          updatedAt: page[page.length - 1]!.updatedAt,
          threadId: page[page.length - 1]!.threadId,
        })
      : null;
  return { page, nextCursor };
}
