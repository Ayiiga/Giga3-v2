/**
 * Verify a Google Identity Services ID token.
 *
 * Follows https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
 * Signature, issuer, audience, and expiration are checked locally against Google's
 * JWKS. The caller's email is never accepted from a separate argument — only the
 * verified `email` claim is returned, and only when `email_verified` is true.
 * `sub` is the stable account identifier. Access tokens are not accepted.
 */

export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

export type GoogleTokenFailure =
  | "malformed"
  | "signature"
  | "expired"
  | "audience"
  | "issuer"
  | "claims";

export class GoogleTokenError extends Error {
  readonly reason: GoogleTokenFailure;

  constructor(reason: GoogleTokenFailure, message: string) {
    super(message);
    this.name = "GoogleTokenError";
    this.reason = reason;
  }
}

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: true;
  name?: string;
  picture?: string;
};

export type GoogleJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

export type VerifyGoogleIdTokenOptions = {
  /** OAuth web client id (or ids) this token must have been issued for. */
  audiences: string | string[];
  nowMs?: number;
  clockSkewSec?: number;
  /**
   * Load Google's signing keys. `forceRefresh` is true when the token's `kid`
   * was not in the cached set (key rotation).
   */
  getKeys: (forceRefresh: boolean) => Promise<GoogleJwk[]>;
};

type JwtHeader = { alg?: string; kid?: string; typ?: string };

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
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJsonPart(part: string): unknown {
  const json = new TextDecoder().decode(base64UrlToBytes(part));
  return JSON.parse(json) as unknown;
}

function allowedAudiences(audiences: string | string[]): string[] {
  const list = (Array.isArray(audiences) ? audiences : [audiences])
    .map((value) => value.trim())
    .filter(Boolean);
  return list;
}

function audienceMatches(aud: unknown, allowed: string[]): boolean {
  const values = Array.isArray(aud) ? aud : [aud];
  return values.some((value) => typeof value === "string" && allowed.includes(value));
}

async function verifyRs256(
  signingInput: string,
  signaturePart: string,
  jwk: GoogleJwk
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

export function googleTokenErrorMessage(reason: GoogleTokenFailure): string {
  switch (reason) {
    case "expired":
      return "Google sign-in expired. Try again.";
    case "audience":
      return "Google sign-in was not issued for this app.";
    case "claims":
      return "Google did not provide a verified email for this account.";
    default:
      return "Google sign-in could not be verified. Try again.";
  }
}

/**
 * Verify signature, iss, aud, exp, and required claims.
 * Throws GoogleTokenError. Never returns an identity from an unverified email.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  options: VerifyGoogleIdTokenOptions
): Promise<GoogleIdentity> {
  const allowed = allowedAudiences(options.audiences);
  if (allowed.length === 0) {
    throw new GoogleTokenError("audience", "Google sign-in is not configured.");
  }

  const token = idToken.trim();
  if (token.length < 20 || token.length > 8192) {
    throw new GoogleTokenError("malformed", "Google sign-in could not be verified.");
  }
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new GoogleTokenError("malformed", "Google sign-in could not be verified.");
  }

  let header: JwtHeader;
  let payload: Record<string, unknown>;
  try {
    const decodedHeader = decodeJsonPart(parts[0]);
    const decodedPayload = decodeJsonPart(parts[1]);
    if (!decodedHeader || typeof decodedHeader !== "object" || Array.isArray(decodedHeader)) {
      throw new Error("header");
    }
    if (!decodedPayload || typeof decodedPayload !== "object" || Array.isArray(decodedPayload)) {
      throw new Error("payload");
    }
    header = decodedHeader as JwtHeader;
    payload = decodedPayload as Record<string, unknown>;
  } catch {
    throw new GoogleTokenError("malformed", "Google sign-in could not be verified.");
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw new GoogleTokenError("signature", "Google sign-in could not be verified.");
  }

  let keys = await options.getKeys(false);
  let jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    keys = await options.getKeys(true);
    jwk = keys.find((key) => key.kid === header.kid);
  }
  if (!jwk) {
    throw new GoogleTokenError("signature", "Google sign-in could not be verified.");
  }

  let signatureOk = false;
  try {
    signatureOk = await verifyRs256(`${parts[0]}.${parts[1]}`, parts[2], jwk);
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) {
    throw new GoogleTokenError("signature", "Google sign-in could not be verified.");
  }

  const iss = payload.iss;
  if (typeof iss !== "string" || !GOOGLE_ISSUERS.has(iss)) {
    throw new GoogleTokenError("issuer", "Google sign-in could not be verified.");
  }
  if (!audienceMatches(payload.aud, allowed)) {
    throw new GoogleTokenError("audience", "Google sign-in was not issued for this app.");
  }
  if (typeof payload.azp === "string" && !allowed.includes(payload.azp)) {
    throw new GoogleTokenError("audience", "Google sign-in was not issued for this app.");
  }

  const skew = options.clockSkewSec ?? 60;
  const nowSec = Math.floor((options.nowMs ?? Date.now()) / 1000);
  if (typeof payload.exp !== "number" || nowSec > payload.exp + skew) {
    throw new GoogleTokenError("expired", "Google sign-in expired. Try again.");
  }
  if (typeof payload.nbf === "number" && payload.nbf > nowSec + skew) {
    throw new GoogleTokenError("claims", "Google sign-in could not be verified.");
  }
  if (typeof payload.iat === "number" && payload.iat > nowSec + skew) {
    throw new GoogleTokenError("claims", "Google sign-in could not be verified.");
  }

  const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!sub || sub.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new GoogleTokenError("claims", "Google did not provide a verified email for this account.");
  }
  if (payload.email_verified !== true) {
    throw new GoogleTokenError("claims", "Google did not provide a verified email for this account.");
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

let jwksCache: { keys: GoogleJwk[]; expiresAt: number } | null = null;

function cacheTtlMs(cacheControl: string | null): number {
  const match = cacheControl?.match(/max-age=(\d+)/i);
  const seconds = match ? Number(match[1]) : 3600;
  if (!Number.isFinite(seconds) || seconds <= 0) return 60_000;
  return Math.min(seconds * 1000, 24 * 60 * 60 * 1000);
}

/** Fetch and briefly cache https://www.googleapis.com/oauth2/v3/certs */
export async function fetchGoogleJwks(forceRefresh = false, now = Date.now()): Promise<GoogleJwk[]> {
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;
  const response = await fetch(GOOGLE_JWKS_URL, { method: "GET" });
  if (!response.ok) {
    throw new GoogleTokenError("signature", "Google sign-in could not be verified.");
  }
  const body = (await response.json()) as { keys?: GoogleJwk[] };
  if (!body.keys?.length) {
    throw new GoogleTokenError("signature", "Google sign-in could not be verified.");
  }
  jwksCache = {
    keys: body.keys,
    expiresAt: now + cacheTtlMs(response.headers.get("cache-control")),
  };
  return body.keys;
}

/** Test-only cache reset. */
export function clearGoogleJwksCache(): void {
  jwksCache = null;
}
