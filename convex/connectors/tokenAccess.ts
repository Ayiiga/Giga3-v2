import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { decryptSecret, encryptSecret } from "./crypto";
import { getExternalConnector } from "./registry";
import {
  exchangeGoogleCode,
  refreshGoogleToken,
  revokeGoogleToken,
} from "./providers/google";
import {
  exchangeMicrosoftCode,
  refreshMicrosoftToken,
} from "./providers/microsoft";
import { exchangeNotionCode } from "./providers/notion";
import { exchangeZoomCode, refreshZoomToken } from "./providers/zoom";

type ActionRunner = ActionCtx;

export async function loadDecryptedTokens(
  ctx: ActionRunner,
  userId: string,
  provider: string
) {
  const row = await ctx.runQuery(internal.connectors.store.getConnectionInternal, {
    userId,
    provider,
  });
  if (!row || row.status === "revoked") return null;
  const accessToken = await decryptSecret(row.accessTokenEnc);
  const refreshToken = row.refreshTokenEnc
    ? await decryptSecret(row.refreshTokenEnc)
    : undefined;
  return {
    connectionId: row._id,
    accessToken,
    refreshToken,
    expiresAt: row.tokenExpiresAt,
    scopes: row.scopes,
    metadataJson: row.metadataJson,
    status: row.status,
    accountLabel: row.accountLabel,
  };
}

export async function ensureFreshAccessToken(
  ctx: ActionRunner,
  userId: string,
  provider: string
): Promise<string> {
  const tokens = await loadDecryptedTokens(ctx, userId, provider);
  if (!tokens) throw new Error("Connector is not connected.");
  if (tokens.status === "needs_reauth") {
    throw new Error("Reconnect this integration — authorisation has expired.");
  }

  const skewMs = 60_000;
  const stillValid =
    !tokens.expiresAt || tokens.expiresAt > Date.now() + skewMs;
  if (stillValid) return tokens.accessToken;

  if (!tokens.refreshToken) {
    await ctx.runMutation(internal.connectors.store.markConnectionStatusInternal, {
      connectionId: tokens.connectionId,
      status: "needs_reauth",
      lastError: "Access token expired and no refresh token is stored.",
    });
    throw new Error("Reconnect this integration — authorisation has expired.");
  }

  try {
    const refreshed = await refreshProviderToken(provider, tokens.refreshToken);
    const accessTokenEnc = await encryptSecret(refreshed.access_token);
    const refreshTokenEnc = refreshed.refresh_token
      ? await encryptSecret(refreshed.refresh_token)
      : tokens.refreshToken
        ? await encryptSecret(tokens.refreshToken)
        : undefined;
    const tokenExpiresAt = refreshed.expires_in
      ? Date.now() + refreshed.expires_in * 1000
      : undefined;
    await ctx.runMutation(internal.connectors.store.markConnectionStatusInternal, {
      connectionId: tokens.connectionId,
      status: "connected",
      accessTokenEnc,
      refreshTokenEnc,
      tokenExpiresAt,
      lastError: undefined,
    });
    return refreshed.access_token;
  } catch (e) {
    await ctx.runMutation(internal.connectors.store.markConnectionStatusInternal, {
      connectionId: tokens.connectionId,
      status: "needs_reauth",
      lastError: e instanceof Error ? e.message : "Token refresh failed",
    });
    throw new Error("Reconnect this integration — token refresh failed.");
  }
}

async function refreshProviderToken(provider: string, refreshToken: string) {
  if (provider === "google_drive" || provider === "gmail") {
    const clientId = process.env.GOOGLE_CONNECTOR_CLIENT_ID?.trim() || "";
    const clientSecret = process.env.GOOGLE_CONNECTOR_CLIENT_SECRET?.trim() || "";
    return refreshGoogleToken({ clientId, clientSecret, refreshToken });
  }
  if (provider === "outlook_calendar") {
    const clientId = process.env.MICROSOFT_CONNECTOR_CLIENT_ID?.trim() || "";
    const clientSecret = process.env.MICROSOFT_CONNECTOR_CLIENT_SECRET?.trim() || "";
    const cfg = getExternalConnector("outlook_calendar")!;
    return refreshMicrosoftToken({
      clientId,
      clientSecret,
      refreshToken,
      scopes: cfg.scopes,
      tenantId: process.env.MICROSOFT_CONNECTOR_TENANT?.trim(),
    });
  }
  if (provider === "zoom") {
    const clientId = process.env.ZOOM_CONNECTOR_CLIENT_ID?.trim() || "";
    const clientSecret = process.env.ZOOM_CONNECTOR_CLIENT_SECRET?.trim() || "";
    return refreshZoomToken({ clientId, clientSecret, refreshToken });
  }
  throw new Error(`Token refresh is not supported for ${provider}.`);
}

export async function exchangeAuthorizationCode(args: {
  provider: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}) {
  const cfg = getExternalConnector(args.provider);
  if (!cfg) throw new Error("Unknown connector.");

  if (args.provider === "google_drive" || args.provider === "gmail") {
    return exchangeGoogleCode({
      clientId: process.env.GOOGLE_CONNECTOR_CLIENT_ID!.trim(),
      clientSecret: process.env.GOOGLE_CONNECTOR_CLIENT_SECRET!.trim(),
      redirectUri: args.redirectUri,
      code: args.code,
      codeVerifier: args.codeVerifier,
    });
  }
  if (args.provider === "outlook_calendar") {
    return exchangeMicrosoftCode({
      clientId: process.env.MICROSOFT_CONNECTOR_CLIENT_ID!.trim(),
      clientSecret: process.env.MICROSOFT_CONNECTOR_CLIENT_SECRET!.trim(),
      redirectUri: args.redirectUri,
      code: args.code,
      scopes: cfg.scopes,
      tenantId: process.env.MICROSOFT_CONNECTOR_TENANT?.trim(),
    });
  }
  if (args.provider === "zoom") {
    return exchangeZoomCode({
      clientId: process.env.ZOOM_CONNECTOR_CLIENT_ID!.trim(),
      clientSecret: process.env.ZOOM_CONNECTOR_CLIENT_SECRET!.trim(),
      redirectUri: args.redirectUri,
      code: args.code,
    });
  }
  if (args.provider === "notion") {
    return exchangeNotionCode({
      clientId: process.env.NOTION_CONNECTOR_CLIENT_ID!.trim(),
      clientSecret: process.env.NOTION_CONNECTOR_CLIENT_SECRET!.trim(),
      redirectUri: args.redirectUri,
      code: args.code,
    });
  }
  throw new Error(`OAuth exchange not implemented for ${args.provider}`);
}

export async function revokeProviderAccess(
  provider: string,
  accessToken: string
): Promise<void> {
  if (provider === "google_drive" || provider === "gmail") {
    await revokeGoogleToken(accessToken);
  }
  // Microsoft / Zoom / Notion: disconnect by deleting stored tokens locally.
}
