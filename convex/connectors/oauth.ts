"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireSession } from "../auth";
import { encryptSecret, randomUrlSafeToken } from "./crypto";
import {
  frontendBaseUrl,
  getExternalConnector,
  isProviderConfigured,
  oauthCallbackUrl,
} from "./registry";
import { googleAuthUrl, fetchGoogleUserInfo } from "./providers/google";
import {
  microsoftAuthUrl,
  fetchMsProfile,
} from "./providers/microsoft";
import { notionAuthUrl } from "./providers/notion";
import { zoomAuthUrl, fetchZoomUser } from "./providers/zoom";
import { normalizeSiteUrl, verifyMoodleToken } from "./providers/moodle";
import {
  exchangeAuthorizationCode,
  loadDecryptedTokens,
  revokeProviderAccess,
} from "./tokenAccess";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export const startOAuth = action({
  args: {
    sessionToken: v.string(),
    provider: v.string(),
    returnPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const provider = getExternalConnector(args.provider);
    if (!provider) throw new Error("Unknown connector.");
    if (provider.authKind !== "oauth2") {
      throw new Error("This connector uses a token form, not OAuth.");
    }
    if (!isProviderConfigured(provider)) {
      throw new Error(
        `Connector is not configured on the server. Missing: ${provider.requiredEnvKeys.join(", ")}`
      );
    }
    const redirectUri = oauthCallbackUrl();
    if (!redirectUri) {
      throw new Error("CONVEX_SITE_URL is not configured for OAuth callbacks.");
    }

    const state = randomUrlSafeToken(24);
    const returnPath =
      args.returnPath?.startsWith("/") && !args.returnPath.startsWith("//")
        ? args.returnPath
        : "/automation/?tab=integrations";

    await ctx.runMutation(internal.connectors.store.createOAuthStateInternal, {
      state,
      userId,
      provider: provider.id,
      returnPath,
      expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    });

    let authorizeUrl = "";
    if (provider.id === "google_drive" || provider.id === "gmail") {
      authorizeUrl = googleAuthUrl({
        clientId: process.env.GOOGLE_CONNECTOR_CLIENT_ID!.trim(),
        redirectUri,
        scopes: provider.scopes,
        state,
      });
    } else if (provider.id === "outlook_calendar") {
      authorizeUrl = microsoftAuthUrl({
        clientId: process.env.MICROSOFT_CONNECTOR_CLIENT_ID!.trim(),
        redirectUri,
        scopes: provider.scopes,
        state,
        tenantId: process.env.MICROSOFT_CONNECTOR_TENANT?.trim(),
      });
    } else if (provider.id === "zoom") {
      authorizeUrl = zoomAuthUrl({
        clientId: process.env.ZOOM_CONNECTOR_CLIENT_ID!.trim(),
        redirectUri,
        state,
      });
    } else if (provider.id === "notion") {
      authorizeUrl = notionAuthUrl({
        clientId: process.env.NOTION_CONNECTOR_CLIENT_ID!.trim(),
        redirectUri,
        state,
      });
    } else {
      throw new Error("OAuth is not available for this connector.");
    }

    await ctx.runMutation(internal.connectors.store.writeAuditInternal, {
      userId,
      provider: provider.id,
      action: "oauth_start",
      ok: true,
    });

    return { authorizeUrl, state };
  },
});

/** Completes OAuth after HTTP callback validates state (called from httpAction). */
export const completeOAuthInternal = internalAction({
  args: {
    state: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const oauthState = await ctx.runMutation(
      internal.connectors.store.consumeOAuthStateInternal,
      { state: args.state }
    );
    if (!oauthState) {
      return {
        ok: false as const,
        redirectUrl: `${frontendBaseUrl()}/automation/?tab=integrations&connector_error=invalid_state`,
      };
    }

    const provider = getExternalConnector(oauthState.provider);
    if (!provider) {
      return {
        ok: false as const,
        redirectUrl: `${frontendBaseUrl()}${oauthState.returnPath}${oauthState.returnPath.includes("?") ? "&" : "?"}connector_error=unknown_provider`,
      };
    }

    try {
      const redirectUri = oauthCallbackUrl();
      const token = await exchangeAuthorizationCode({
        provider: provider.id,
        code: args.code,
        redirectUri,
        codeVerifier: oauthState.codeVerifier,
      });

      let accountLabel: string | undefined;
      const access = token.access_token;
      if (provider.id === "google_drive" || provider.id === "gmail") {
        const info = await fetchGoogleUserInfo(access);
        accountLabel = info.email || info.name;
      } else if (provider.id === "outlook_calendar") {
        const profile = await fetchMsProfile(access);
        accountLabel = profile.mail || profile.userPrincipalName || profile.displayName;
      } else if (provider.id === "zoom") {
        const user = await fetchZoomUser(access);
        accountLabel = user.email || user.display_name;
      } else if (provider.id === "notion") {
        accountLabel =
          (token as { workspace_name?: string }).workspace_name || "Notion workspace";
      }

      const accessTokenEnc = await encryptSecret(access);
      const refresh = (token as { refresh_token?: string }).refresh_token;
      const refreshTokenEnc = refresh ? await encryptSecret(refresh) : undefined;
      const expiresIn = (token as { expires_in?: number }).expires_in;
      const scopes =
        typeof (token as { scope?: string }).scope === "string"
          ? (token as { scope: string }).scope.split(/[\s,]+/).filter(Boolean)
          : provider.scopes;

      await ctx.runMutation(internal.connectors.store.upsertConnectionInternal, {
        userId: oauthState.userId,
        provider: provider.id,
        status: "connected",
        accountLabel,
        scopes,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
        metadataJson:
          provider.id === "notion"
            ? JSON.stringify({
                workspaceId: (token as { workspace_id?: string }).workspace_id,
              })
            : undefined,
      });

      await ctx.runMutation(internal.connectors.store.writeAuditInternal, {
        userId: oauthState.userId,
        provider: provider.id,
        action: "oauth_complete",
        ok: true,
        detail: accountLabel,
      });

      const sep = oauthState.returnPath.includes("?") ? "&" : "?";
      return {
        ok: true as const,
        redirectUrl: `${frontendBaseUrl()}${oauthState.returnPath}${sep}connector_connected=${provider.id}`,
      };
    } catch (e) {
      await ctx.runMutation(internal.connectors.store.writeAuditInternal, {
        userId: oauthState.userId,
        provider: provider.id,
        action: "oauth_complete",
        ok: false,
        detail: e instanceof Error ? e.message : "oauth_failed",
      });
      const sep = oauthState.returnPath.includes("?") ? "&" : "?";
      return {
        ok: false as const,
        redirectUrl: `${frontendBaseUrl()}${oauthState.returnPath}${sep}connector_error=oauth_failed`,
      };
    }
  },
});

export const connectMoodle = action({
  args: {
    sessionToken: v.string(),
    siteUrl: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const siteUrl = normalizeSiteUrl(args.siteUrl);
    const token = args.token.trim();
    if (!token || token.length < 16) throw new Error("Invalid Moodle web-service token.");

    const info = await verifyMoodleToken(siteUrl, token);
    const accessTokenEnc = await encryptSecret(token);
    await ctx.runMutation(internal.connectors.store.upsertConnectionInternal, {
      userId,
      provider: "moodle",
      status: "connected",
      accountLabel: `${info.username || "user"} @ ${info.siteName}`,
      scopes: ["moodle_webservice"],
      accessTokenEnc,
      metadataJson: JSON.stringify({ siteUrl }),
    });
    await ctx.runMutation(internal.connectors.store.writeAuditInternal, {
      userId,
      provider: "moodle",
      action: "connect_token",
      ok: true,
      detail: siteUrl,
    });
    return { ok: true as const, accountLabel: info.siteName };
  },
});

export const disconnect = action({
  args: {
    sessionToken: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken, ctx);
    const provider = getExternalConnector(args.provider);
    if (!provider) throw new Error("Unknown connector.");

    const tokens = await loadDecryptedTokens(ctx, userId, provider.id);
    if (tokens) {
      try {
        await revokeProviderAccess(provider.id, tokens.accessToken);
      } catch {
        /* best-effort revocation */
      }
    }

    await ctx.runMutation(internal.connectors.store.deleteConnectionInternal, {
      userId,
      provider: provider.id,
    });
    await ctx.runMutation(internal.connectors.store.writeAuditInternal, {
      userId,
      provider: provider.id,
      action: "disconnect",
      ok: true,
    });
    return { ok: true as const };
  },
});
