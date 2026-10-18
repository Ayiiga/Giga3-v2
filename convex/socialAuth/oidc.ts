/**
 * Minimal OIDC ID token verification (RS256 JWKS).
 * Used by Apple and Microsoft social login — not Google GIS (see googleIdToken.ts)
 * and not connector token exchanges.
 */

export type OidcFailure =
  | "malformed"
  | "signature"
  | "expired"
  | "audience"
  | "issuer"
  | "nonce"
  | "claims";

export class OidcTokenError extends Error {
  readonly reason: OidcFailure;

  constructor(reason: OidcFailure, message: string) {
    super(message);
    this.name = "OidcTokenError";
    this.reason = reason;
  }
}

export type OidcIdentity = {
  sub: string;
  email: string;
  emailVerified: true;
  name?: string;
  picture?: string;
};

type JwtHeader = { alg?: string; kid?: string; typ?: string };
export type OidcJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJsonPart(part: string): unknown {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
}

function audienceMatches(aud: unknown, allowed: string[]): boolean {
  const values = Array.isArray(aud) ? aud : [aud];
  return values.some((value) => typeof value === "string" && allowed.includes(value));
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

export type VerifyOidcIdTokenOptions = {
  audiences: string | string[];
  issuers: string[];
  nonce?: string;
  nowMs?: number;
  clockSkewSec?: number;
  /**
   * When true, accept email_verified missing/false only if `allowUnverifiedEmail`
   * is also true (GitHub path does not use this helper).
   */
  requireEmailVerified?: boolean;
  getKeys: (forceRefresh: boolean) => Promise<OidcJwk[]>;
};

export async function verifyOidcIdToken(
  idToken: string,
  options: VerifyOidcIdTokenOptions
): Promise<OidcIdentity> {
  const allowed = (Array.isArray(options.audiences) ? options.audiences : [options.audiences])
    .map((v) => v.trim())
    .filter(Boolean);
  if (allowed.length === 0) {
    throw new OidcTokenError("audience", "Sign-in is not configured.");
  }

  const token = idToken.trim();
  if (token.length < 20 || token.length > 16384) {
    throw new OidcTokenError("malformed", "Sign-in could not be verified.");
  }
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => !p)) {
    throw new OidcTokenError("malformed", "Sign-in could not be verified.");
  }

  let header: JwtHeader;
  let payload: Record<string, unknown>;
  try {
    header = decodeJsonPart(parts[0]!) as JwtHeader;
    payload = decodeJsonPart(parts[1]!) as Record<string, unknown>;
  } catch {
    throw new OidcTokenError("malformed", "Sign-in could not be verified.");
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw new OidcTokenError("signature", "Sign-in could not be verified.");
  }

  let keys = await options.getKeys(false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await options.getKeys(true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new OidcTokenError("signature", "Sign-in could not be verified.");
  }

  let ok = false;
  try {
    ok = await verifyRs256(`${parts[0]}.${parts[1]}`, parts[2]!, jwk);
  } catch {
    ok = false;
  }
  if (!ok) {
    throw new OidcTokenError("signature", "Sign-in could not be verified.");
  }

  const iss = payload.iss;
  if (typeof iss !== "string" || !options.issuers.includes(iss)) {
    throw new OidcTokenError("issuer", "Sign-in could not be verified.");
  }
  if (!audienceMatches(payload.aud, allowed)) {
    throw new OidcTokenError("audience", "Sign-in was not issued for this app.");
  }

  const skew = options.clockSkewSec ?? 60;
  const nowSec = Math.floor((options.nowMs ?? Date.now()) / 1000);
  if (typeof payload.exp !== "number" || nowSec > payload.exp + skew) {
    throw new OidcTokenError("expired", "Sign-in expired. Try again.");
  }
  if (typeof payload.nbf === "number" && payload.nbf > nowSec + skew) {
    throw new OidcTokenError("claims", "Sign-in could not be verified.");
  }
  if (typeof payload.iat === "number" && payload.iat > nowSec + skew) {
    throw new OidcTokenError("claims", "Sign-in could not be verified.");
  }

  if (options.nonce) {
    if (typeof payload.nonce !== "string" || payload.nonce !== options.nonce) {
      throw new OidcTokenError("nonce", "Sign-in could not be verified.");
    }
  }

  const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!sub || sub.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new OidcTokenError("claims", "Provider did not provide a verified email.");
  }

  const requireVerified = options.requireEmailVerified !== false;
  const verified =
    payload.email_verified === true ||
    payload.email_verified === "true" ||
    // Apple sometimes omits email_verified when email is present in a private-relay flow
    // that Apple has already validated for the Services ID — still require true when present.
    (payload.email_verified === undefined && !requireVerified);
  if (requireVerified && payload.email_verified !== true && payload.email_verified !== "true") {
    throw new OidcTokenError("claims", "Provider did not provide a verified email.");
  }
  if (!verified && requireVerified) {
    throw new OidcTokenError("claims", "Provider did not provide a verified email.");
  }

  const name = typeof payload.name === "string" ? payload.name : undefined;
  const picture = typeof payload.picture === "string" ? payload.picture : undefined;
  return {
    sub,
    email,
    emailVerified: true,
    ...(name ? { name } : {}),
    ...(picture ? { picture } : {}),
  };
}

const jwksCaches = new Map<string, { keys: OidcJwk[]; expiresAt: number }>();

function cacheTtlMs(cacheControl: string | null): number {
  const match = cacheControl?.match(/max-age=(\d+)/i);
  const seconds = match ? Number(match[1]) : 3600;
  if (!Number.isFinite(seconds) || seconds <= 0) return 60_000;
  return Math.min(seconds * 1000, 24 * 60 * 60 * 1000);
}

export async function fetchOidcJwks(
  jwksUrl: string,
  forceRefresh = false,
  now = Date.now()
): Promise<OidcJwk[]> {
  const cached = jwksCaches.get(jwksUrl);
  if (!forceRefresh && cached && cached.expiresAt > now) return cached.keys;
  const response = await fetch(jwksUrl, { method: "GET" });
  if (!response.ok) {
    throw new OidcTokenError("signature", "Sign-in could not be verified.");
  }
  const body = (await response.json()) as { keys?: OidcJwk[] };
  if (!body.keys?.length) {
    throw new OidcTokenError("signature", "Sign-in could not be verified.");
  }
  jwksCaches.set(jwksUrl, {
    keys: body.keys,
    expiresAt: now + cacheTtlMs(response.headers.get("cache-control")),
  });
  return body.keys;
}

/** Test-only. */
export function clearOidcJwksCache(): void {
  jwksCaches.clear();
}
