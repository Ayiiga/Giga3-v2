/**
 * Sign in with Apple for *social login*.
 * Client secret is a short-lived ES256 JWT (Team ID + Key ID + .p8).
 * Email may be absent on repeat logins — subject is the stable identifier.
 */

import { fetchOidcJwks, OidcTokenError, type OidcJwk } from "../oidc";

type FetchLike = typeof fetch;

const APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUER = "https://appleid.apple.com";

export type AppleIdentity = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name?: string;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function decodeJsonPart(part: string): unknown {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
}

/** Build Apple client_secret JWT (mint ~20 minutes). */
export async function createAppleClientSecret(args: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKeyPem: string;
  nowMs?: number;
}): Promise<string> {
  const now = Math.floor((args.nowMs ?? Date.now()) / 1000);
  const header = { alg: "ES256", kid: args.keyId };
  const payload = {
    iss: args.teamId,
    iat: now,
    exp: now + 20 * 60,
    aud: "https://appleid.apple.com",
    sub: args.clientId,
  };
  const enc = new TextEncoder();
  const headerB64 = bytesToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = bytesToBase64Url(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(args.privateKeyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(signingInput)
  );
  return `${signingInput}.${bytesToBase64Url(new Uint8Array(sig))}`;
}

export function appleLoginAuthUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  scopes: string[];
}): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    response_type: "code",
    response_mode: "form_post",
    state: args.state,
    nonce: args.nonce,
    scope: args.scopes.join(" "),
  });
  return `${APPLE_AUTH_URL}?${params}`;
}

export async function exchangeAppleLoginCode(
  args: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
  },
  fetchImpl: FetchLike = fetch
): Promise<{ id_token: string }> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    code: args.code,
    grant_type: "authorization_code",
    redirect_uri: args.redirectUri,
  });
  const res = await fetchImpl(APPLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    id_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.id_token) {
    throw new Error(
      json.error_description || json.error || `Apple token exchange failed (${res.status})`
    );
  }
  return { id_token: json.id_token };
}

async function verifyRs256(
  signingInput: string,
  signaturePart: string,
  jwk: OidcJwk
): Promise<boolean> {
  if (!jwk.kty || !jwk.n || !jwk.e) return false;
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    toArrayBuffer(base64UrlToBytes(signaturePart)),
    toArrayBuffer(new TextEncoder().encode(signingInput))
  );
}

export async function verifyAppleLoginIdToken(args: {
  idToken: string;
  clientId: string;
  nonce: string;
  nowMs?: number;
}): Promise<AppleIdentity> {
  const token = args.idToken.trim();
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new OidcTokenError("malformed", "Apple sign-in could not be verified.");
  }
  const header = decodeJsonPart(parts[0]!) as { alg?: string; kid?: string };
  const payload = decodeJsonPart(parts[1]!) as Record<string, unknown>;
  if (header.alg !== "RS256" || !header.kid) {
    throw new OidcTokenError("signature", "Apple sign-in could not be verified.");
  }

  let keys = await fetchOidcJwks(APPLE_JWKS_URL, false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await fetchOidcJwks(APPLE_JWKS_URL, true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new OidcTokenError("signature", "Apple sign-in could not be verified.");
  }
  const ok = await verifyRs256(`${parts[0]}.${parts[1]}`, parts[2]!, jwk);
  if (!ok) {
    throw new OidcTokenError("signature", "Apple sign-in could not be verified.");
  }

  if (payload.iss !== APPLE_ISSUER) {
    throw new OidcTokenError("issuer", "Apple sign-in could not be verified.");
  }
  const audOk =
    payload.aud === args.clientId ||
    (Array.isArray(payload.aud) && payload.aud.includes(args.clientId));
  if (!audOk) {
    throw new OidcTokenError("audience", "Apple sign-in was not issued for this app.");
  }
  if (typeof payload.nonce !== "string" || payload.nonce !== args.nonce) {
    throw new OidcTokenError("nonce", "Apple sign-in could not be verified.");
  }

  const skew = 60;
  const nowSec = Math.floor((args.nowMs ?? Date.now()) / 1000);
  if (typeof payload.exp !== "number" || nowSec > payload.exp + skew) {
    throw new OidcTokenError("expired", "Apple sign-in expired. Try again.");
  }

  const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
  if (!sub || sub.length > 255) {
    throw new OidcTokenError("claims", "Apple did not provide a stable subject.");
  }

  const emailRaw = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;
  const emailVerified =
    payload.email_verified === true ||
    payload.email_verified === "true" ||
    // First-auth private relay emails are Apple-validated when present.
    (email !== null && payload.email_verified === undefined);

  return {
    subject: sub,
    email,
    emailVerified: Boolean(email && emailVerified),
    ...(typeof payload.name === "string" ? { name: payload.name } : {}),
  };
}
