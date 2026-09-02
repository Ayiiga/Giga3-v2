import { UnauthorizedError } from "./securityErrors";
import { verifySessionTokenDetailed } from "./sessionAuth";
import { normalizeUserId } from "./userIds";

type AuthContext = {
  runMutation?: (fn: any, args: any) => Promise<any>;
};

/**
 * Optional context that lets `requireSession` enforce server-side revocation
 * (`users.sessionsValidAfter`). Queries/mutations pass `ctx` (has `db`);
 * actions pass `ctx` (has `runQuery`). Without a ctx only the signature and
 * expiry are checked.
 */
export type SessionCheckContext = {
  db?: any;
  runQuery?: (fn: any, args: any) => Promise<any>;
  runMutation?: (fn: any, args: any) => Promise<any>;
};

async function readSessionsValidAfter(
  ctx: SessionCheckContext,
  email: string
): Promise<number | undefined> {
  if (ctx.db) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    return user?.sessionsValidAfter ?? undefined;
  }
  if (ctx.runQuery) {
    const { internal } = await import("./_generated/api");
    const gate = await ctx.runQuery(internal.users.getSessionGateInternal, { email });
    return gate?.sessionsValidAfter ?? undefined;
  }
  return undefined;
}

/**
 * Derives authenticated user email exclusively from a verified session token.
 * Never trusts client-supplied userId/email. When `ctx` is provided, tokens
 * issued before the user's `sessionsValidAfter` (password reset, sign-out
 * everywhere) are rejected.
 */
export async function requireSession(
  sessionToken: string | undefined,
  ctx?: SessionCheckContext
): Promise<string> {
  if (!sessionToken?.trim()) {
    throw new UnauthorizedError();
  }
  const session = await verifySessionTokenDetailed(sessionToken);
  if (ctx) {
    const validAfter = await readSessionsValidAfter(ctx, session.email);
    if (validAfter && session.iat < validAfter) {
      throw new UnauthorizedError("This session was signed out. Please sign in again.");
    }
  }
  return session.email;
}

/**
 * Session helper for chat shell queries. Returns null instead of throwing so an
 * expired/invalid token cannot crash the React error boundary via useQuery.
 */
export async function tryRequireSession(
  sessionToken: string | undefined,
  ctx?: SessionCheckContext
): Promise<string | null> {
  try {
    return await requireSession(sessionToken, ctx);
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

/** @deprecated Use requireSession — client identity claims are ignored. */
export async function requireAuthenticatedEmail(
  sessionToken: string | undefined,
  _claimedUserId?: string
): Promise<string> {
  return await requireSession(sessionToken);
}

export async function requireSessionWithMonitoring(
  sessionToken: string | undefined,
  ctx: AuthContext & SessionCheckContext,
  eventMeta?: string
): Promise<string> {
  try {
    return await requireSession(sessionToken, ctx);
  } catch (error) {
    if (ctx.runMutation) {
      const { internal } = await import("./_generated/api");
      const { SECURITY_EVENT_TYPES } = await import("./securityMonitoring");
      await ctx.runMutation(internal.securityMonitoring.recordSecurityEvent, {
        eventType: SECURITY_EVENT_TYPES.AUTH_FAILURE,
        severity: "medium",
        message: "Session verification failed",
        metadata: eventMeta,
      }).catch(() => null);
    }
    throw error;
  }
}

export function emailFromSessionOrThrow(email: string): string {
  return normalizeUserId(email);
}
