import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createSessionToken } from "./sessionAuth";
import { requireSession } from "./auth";
import { UnauthorizedError } from "./securityErrors";
import {
  fetchGoogleJwks,
  googleTokenErrorMessage,
  GoogleTokenError,
  verifyGoogleIdToken,
} from "./googleIdToken";
import { googleLinkRejectionMessage } from "./googleAccountLink";
import { googleClientIdCandidates } from "./socialAuth/registry";
import { SECURITY_EVENT_TYPES } from "./securityMonitoring";

const GOOGLE_SIGN_IN_LIMIT = 10;

/**
 * Sign in or sign up with a Google Identity Services ID token.
 * The browser sends only the ID token. The server verifies it before any
 * account is created or given a session. Email-only matches are never auto-linked.
 */
export const signInWithGoogle = action({
  args: { idToken: v.string() },
  handler: async (ctx, args) => {
    const audiences = googleClientIdCandidates();
    if (audiences.length === 0) {
      throw new UnauthorizedError("Google sign-in is not available right now.");
    }

    let identity;
    try {
      identity = await verifyGoogleIdToken(args.idToken, {
        audiences,
        getKeys: (forceRefresh) => fetchGoogleJwks(forceRefresh),
      });
    } catch (error) {
      const reason = error instanceof GoogleTokenError ? error.reason : "signature";
      throw new UnauthorizedError(googleTokenErrorMessage(reason));
    }

    await ctx.runMutation(internal.passwordAuth.consumePasswordAuthRateLimit, {
      bucketKey: `google:${identity.sub}`,
      maxAttempts: GOOGLE_SIGN_IN_LIMIT,
    });

    const linked = await ctx.runMutation(internal.users.completeGoogleSignInInternal, {
      googleSub: identity.sub,
      email: identity.email,
      emailVerified: identity.emailVerified,
      ...(identity.name ? { name: identity.name } : {}),
      ...(identity.picture ? { image: identity.picture } : {}),
    });

    if (!linked.ok) {
      throw new UnauthorizedError(googleLinkRejectionMessage(linked.code));
    }

    const sessionToken = await createSessionToken(linked.email);
    return { email: linked.email, sessionToken };
  },
});

/**
 * Link a verified Google identity to the currently signed-in account.
 * Requires session ownership and a matching verified Google email.
 */
export const linkGoogleIdentity = action({
  args: {
    sessionToken: v.string(),
    idToken: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionEmail = await requireSession(args.sessionToken, ctx);
    const audiences = googleClientIdCandidates();
    if (audiences.length === 0) {
      throw new UnauthorizedError("Google sign-in is not available right now.");
    }

    let identity;
    try {
      identity = await verifyGoogleIdToken(args.idToken, {
        audiences,
        getKeys: (forceRefresh) => fetchGoogleJwks(forceRefresh),
      });
    } catch (error) {
      const reason = error instanceof GoogleTokenError ? error.reason : "signature";
      throw new UnauthorizedError(googleTokenErrorMessage(reason));
    }

    const linked = await ctx.runMutation(internal.users.linkGoogleIdentityInternal, {
      sessionEmail,
      googleSub: identity.sub,
      email: identity.email,
      emailVerified: identity.emailVerified,
      ...(identity.name ? { name: identity.name } : {}),
      ...(identity.picture ? { image: identity.picture } : {}),
    });

    if (!linked.ok) {
      throw new UnauthorizedError(googleLinkRejectionMessage(linked.code));
    }

    await ctx
      .runMutation(internal.securityMonitoring.recordSecurityEvent, {
        eventType: SECURITY_EVENT_TYPES.SESSION_ROTATED,
        severity: "low",
        message: "Google identity linked to existing account via authenticated link",
        email: linked.email,
      })
      .catch(() => null);

    return { email: linked.email, linked: true as const };
  },
});
