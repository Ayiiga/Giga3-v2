import { UnauthorizedError } from "./securityErrors";
import { verifySessionToken } from "./sessionAuth";
import { normalizeUserId } from "./userIds";

type AuthContext = {
  runMutation?: (fn: any, args: any) => Promise<any>;
};

/**
 * Derives authenticated user email exclusively from a verified session token.
 * Never trusts client-supplied userId/email.
 */
export async function requireSession(sessionToken: string | undefined): Promise<string> {
  if (!sessionToken?.trim()) {
    throw new UnauthorizedError();
  }
  return await verifySessionToken(sessionToken);
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
  ctx: AuthContext,
  eventMeta?: string
): Promise<string> {
  try {
    return await requireSession(sessionToken);
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
