"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireSession } from "../auth";
import { createSessionToken } from "../sessionAuth";
import { UnauthorizedError } from "../securityErrors";
import { createPkcePair, randomUrlSafeToken } from "./pkce";
import {
  frontendBaseUrl,
  getSocialProviderConfig,
  isSocialProviderConfigured,
  socialOAuthCallbackUrl,
} from "./registry";
import { isSocialAuthProvider } from "./types";
import {
  appleLoginAuthUrl,
  createAppleClientSecret,
  exchangeAppleLoginCode,
  verifyAppleLoginIdToken,
} from "./providers/apple";
import {
  exchangeGithubLoginCode,
  fetchGithubIdentity,
  githubLoginAuthUrl,
} from "./providers/github";
import {
  exchangeMicrosoftLoginCode,
  microsoftLoginAuthUrl,
  verifyMicrosoftLoginIdToken,
} from "./providers/microsoft";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const EXCHANGE_CODE_TTL_MS = 2 * 60 * 1000;

function safeReturnPath(path: string | undefined): string {
  if (path?.startsWith("/") && !path.startsWith("//")) return path;
  return "/chat/";
}

/** Start Apple / Microsoft / GitHub social login (or explicit link). */
export const beginSocialOAuth = action({
  args: {
    provider: v.string(),
    returnPath: v.optional(v.string()),
    /** When set, completes as an explicit account link for this session. */
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isSocialAuthProvider(args.provider) || args.provider === "google") {
      // Google uses GIS ID token in the browser — not this redirect flow.
      throw new UnauthorizedError("Unsupported social login provider.");
    }
    const config = getSocialProviderConfig(args.provider);
    if (!config || !isSocialProviderConfigured(config)) {
      throw new UnauthorizedError(
        `${config?.label ?? "Provider"} sign-in is not configured on the server.`
      );
    }
    const redirectUri = socialOAuthCallbackUrl();
    if (!redirectUri) {
      throw new UnauthorizedError("CONVEX_SITE_URL is not configured for social login.");
    }

    let linkUserId: string | undefined;
    if (args.sessionToken) {
      linkUserId = await requireSession(args.sessionToken, ctx);
    }

    const state = randomUrlSafeToken(24);
    const nonce = randomUrlSafeToken(16);
    const { codeVerifier, codeChallenge } = await createPkcePair();
    const returnPath = safeReturnPath(args.returnPath);

    await ctx.runMutation(internal.socialAuth.store.createOAuthStateInternal, {
      state,
      provider: args.provider,
      returnPath,
      codeVerifier,
      nonce,
      linkUserId,
      expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    });

    let authorizeUrl = "";
    if (args.provider === "microsoft") {
      authorizeUrl = microsoftLoginAuthUrl({
        clientId: process.env.AUTH_MICROSOFT_CLIENT_ID!.trim(),
        redirectUri,
        scopes: config.scopes,
        state,
        nonce,
        codeChallenge,
        tenantId: process.env.AUTH_MICROSOFT_TENANT?.trim(),
      });
    } else if (args.provider === "github") {
      authorizeUrl = githubLoginAuthUrl({
        clientId: process.env.AUTH_GITHUB_CLIENT_ID!.trim(),
        redirectUri,
        scopes: config.scopes,
        state,
        codeChallenge,
      });
    } else if (args.provider === "apple") {
      authorizeUrl = appleLoginAuthUrl({
        clientId: process.env.AUTH_APPLE_CLIENT_ID!.trim(),
        redirectUri,
        state,
        nonce,
        scopes: config.scopes,
      });
    }

    return { authorizeUrl };
  },
});

export const completeSocialOAuthInternal = internalAction({
  args: {
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{ redirectUrl: string }> => {
    const frontend = frontendBaseUrl();
    const oauthState = await ctx.runMutation(
      internal.socialAuth.store.consumeOAuthStateInternal,
      { state: args.state }
    );
    if (!oauthState) {
      return {
        redirectUrl: `${frontend}/chat/login/?auth_error=invalid_state`,
      };
    }

    const config = getSocialProviderConfig(oauthState.provider);
    const redirectUri = socialOAuthCallbackUrl();
    if (!config || !redirectUri) {
      return {
        redirectUrl: `${frontend}${oauthState.returnPath}${
          oauthState.returnPath.includes("?") ? "&" : "?"
        }auth_error=not_configured`,
      };
    }

    try {
      let subject = "";
      let email: string | undefined;
      let emailVerified = false;
      let name: string | undefined;
      let image: string | undefined;

      if (oauthState.provider === "microsoft") {
        const tokens = await exchangeMicrosoftLoginCode({
          clientId: process.env.AUTH_MICROSOFT_CLIENT_ID!.trim(),
          clientSecret: process.env.AUTH_MICROSOFT_CLIENT_SECRET!.trim(),
          redirectUri,
          code: args.code,
          codeVerifier: oauthState.codeVerifier || "",
          scopes: config.scopes,
          tenantId: process.env.AUTH_MICROSOFT_TENANT?.trim(),
        });
        const identity = await verifyMicrosoftLoginIdToken({
          idToken: tokens.id_token,
          clientId: process.env.AUTH_MICROSOFT_CLIENT_ID!.trim(),
          nonce: oauthState.nonce || "",
        });
        subject = identity.sub;
        email = identity.email;
        emailVerified = true;
        name = identity.name;
        image = identity.picture;
      } else if (oauthState.provider === "github") {
        const accessToken = await exchangeGithubLoginCode({
          clientId: process.env.AUTH_GITHUB_CLIENT_ID!.trim(),
          clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET!.trim(),
          redirectUri,
          code: args.code,
          codeVerifier: oauthState.codeVerifier || "",
        });
        const identity = await fetchGithubIdentity(accessToken);
        subject = identity.subject;
        email = identity.email;
        emailVerified = true;
        name = identity.name;
        image = identity.picture;
      } else if (oauthState.provider === "apple") {
        const clientSecret = await createAppleClientSecret({
          clientId: process.env.AUTH_APPLE_CLIENT_ID!.trim(),
          teamId: process.env.AUTH_APPLE_TEAM_ID!.trim(),
          keyId: process.env.AUTH_APPLE_KEY_ID!.trim(),
          privateKeyPem: process.env.AUTH_APPLE_PRIVATE_KEY!.trim(),
        });
        const tokens = await exchangeAppleLoginCode({
          clientId: process.env.AUTH_APPLE_CLIENT_ID!.trim(),
          clientSecret,
          redirectUri,
          code: args.code,
        });
        const identity = await verifyAppleLoginIdToken({
          idToken: tokens.id_token,
          clientId: process.env.AUTH_APPLE_CLIENT_ID!.trim(),
          nonce: oauthState.nonce || "",
        });
        subject = identity.subject;
        email = identity.email ?? undefined;
        emailVerified = identity.emailVerified;
        name = identity.name;
      } else {
        return {
          redirectUrl: `${frontend}/chat/login/?auth_error=unsupported_provider`,
        };
      }

      const linked = await ctx.runMutation(
        internal.socialAuth.completeSignIn.completeSocialSignInInternal,
        {
          provider: oauthState.provider,
          subject,
          email,
          emailVerified,
          name,
          image,
          linkUserId: oauthState.linkUserId,
        }
      );

      if (!linked.ok) {
        const code = linked.code;
        return {
          redirectUrl: `${frontend}/chat/login/?auth_error=${encodeURIComponent(code)}`,
        };
      }

      if (oauthState.linkUserId) {
        return {
          redirectUrl: `${frontend}/settings/?auth_linked=${oauthState.provider}`,
        };
      }

      const exchangeCode = randomUrlSafeToken(24);
      await ctx.runMutation(internal.socialAuth.store.createExchangeCodeInternal, {
        code: exchangeCode,
        email: linked.email,
        expiresAt: Date.now() + EXCHANGE_CODE_TTL_MS,
      });

      return {
        redirectUrl: `${frontend}/chat/login/?auth_code=${exchangeCode}&next=${encodeURIComponent(oauthState.returnPath)}`,
      };
    } catch {
      return {
        redirectUrl: `${frontend}/chat/login/?auth_error=oauth_failed`,
      };
    }
  },
});

/** Exchange a one-time OAuth handoff code for a Giga3 session. */
export const exchangeSocialAuthCode = action({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const consumed = await ctx.runMutation(
      internal.socialAuth.store.consumeExchangeCodeInternal,
      { code: args.code.trim() }
    );
    if (!consumed) {
      throw new UnauthorizedError("Sign-in link expired. Try again.");
    }
    const sessionToken = await createSessionToken(consumed.email);
    return { email: consumed.email, sessionToken };
  },
});

export { socialLinkRejectionMessage };
