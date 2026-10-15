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
