import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createSessionToken } from "./sessionAuth";
import { UnauthorizedError } from "./securityErrors";
import {
  fetchGoogleJwks,
  googleTokenErrorMessage,
  GoogleTokenError,
  verifyGoogleIdToken,
} from "./googleIdToken";
import { googleLinkRejectionMessage } from "./googleAccountLink";
import { SECURITY_EVENT_TYPES } from "./securityMonitoring";

const GOOGLE_SIGN_IN_LIMIT = 10;

function googleClientIds(): string[] {
  const raw = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Sign in or sign up with a Google Identity Services ID token.
 * The browser sends only the ID token. The server verifies it before any
 * account is created, linked, or given a session.
 */
export const signInWithGoogle = action({
  args: { idToken: v.string() },
  handler: async (ctx, args) => {
    const audiences = googleClientIds();
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

    if (linked.kind === "link") {
      await ctx
        .runMutation(internal.securityMonitoring.recordSecurityEvent, {
          eventType: SECURITY_EVENT_TYPES.SESSION_ROTATED,
          severity: "low",
          message: "Google identity linked to existing email account",
          email: linked.email,
        })
        .catch(() => null);
    }

    const sessionToken = await createSessionToken(linked.email);
    return { email: linked.email, sessionToken };
  },
});
