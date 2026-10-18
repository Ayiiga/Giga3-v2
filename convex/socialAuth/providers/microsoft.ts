/** Microsoft Entra ID for *social login* — separate from MICROSOFT_CONNECTOR_*. */

import { fetchOidcJwks, verifyOidcIdToken, type OidcIdentity } from "../oidc";

type FetchLike = typeof fetch;

function tenant(envTenant?: string): string {
  return envTenant?.trim() || "common";
}

function decodeJwtPayload(idToken: string): Record<string, unknown> {
  const part = idToken.split(".")[1];
  if (!part) throw new Error("Microsoft ID token malformed.");
  const padded = part.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return JSON.parse(atob(padded + pad)) as Record<string, unknown>;
}

function isAllowedMicrosoftIssuer(iss: string): boolean {
  return (
    /^https:\/\/login\.microsoftonline\.com\/[0-9a-fA-F-]{36}\/v2\.0$/.test(iss) ||
    /^https:\/\/login\.microsoftonline\.com\/(common|organizations|consumers)\/v2\.0$/.test(iss)
  );
}

export function microsoftLoginAuthUrl(args: {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  nonce: string;
  codeChallenge: string;
  tenantId?: string;
}): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    response_type: "code",
    redirect_uri: args.redirectUri,
    response_mode: "query",
    scope: args.scopes.join(" "),
    state: args.state,
    nonce: args.nonce,
    code_challenge: args.codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://login.microsoftonline.com/${tenant(args.tenantId)}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeMicrosoftLoginCode(
  args: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
    codeVerifier: string;
    scopes: string[];
    tenantId?: string;
  },
  fetchImpl: FetchLike = fetch
): Promise<{ id_token: string; access_token?: string }> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    code: args.code,
    redirect_uri: args.redirectUri,
    grant_type: "authorization_code",
    code_verifier: args.codeVerifier,
    scope: args.scopes.join(" "),
  });
  const res = await fetchImpl(
    `https://login.microsoftonline.com/${tenant(args.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );
  const json = (await res.json()) as {
    id_token?: string;
    access_token?: string;
    error_description?: string;
  };
  if (!res.ok || !json.id_token) {
    throw new Error(
      json.error_description || `Microsoft login token exchange failed (${res.status})`
    );
  }
  return { id_token: json.id_token, access_token: json.access_token };
}

export async function verifyMicrosoftLoginIdToken(args: {
  idToken: string;
  clientId: string;
  nonce: string;
}): Promise<OidcIdentity> {
  const payload = decodeJwtPayload(args.idToken);
  const iss = typeof payload.iss === "string" ? payload.iss : "";
  if (!isAllowedMicrosoftIssuer(iss)) {
    throw new Error("Microsoft ID token issuer is not allowed.");
  }
  return verifyOidcIdToken(args.idToken, {
    audiences: args.clientId,
    issuers: [iss],
    nonce: args.nonce,
    getKeys: (force) =>
      fetchOidcJwks("https://login.microsoftonline.com/common/discovery/v2.0/keys", force),
    requireEmailVerified: true,
  });
}
