import { normalizeUserId } from "./userIds";
import { UnauthorizedError } from "./securityErrors";

const TOKEN_PREFIX = "giga3.v1";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type SessionPayload = {
  email: string;
  exp: number;
  iat: number;
  kid?: string;
};

function getSigningSecrets(): { current: string; previous?: string; kid: string } {
  const current = process.env.SESSION_SIGNING_SECRET?.trim();
  const previous = process.env.SESSION_SIGNING_SECRET_PREVIOUS?.trim();
  if (!current) {
    // Fail closed: never derive session signing from an unrelated admin key.
    throw new Error(
      "SESSION_SIGNING_SECRET is not configured — set it on the Convex deployment (npx convex env set SESSION_SIGNING_SECRET ...)"
    );
  }
  return {
    current,
    previous: previous || undefined,
    kid: process.env.SESSION_SIGNING_KEY_ID?.trim() || "primary",
  };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(payloadB64: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  return base64UrlEncode(new Uint8Array(sig));
}

async function verifySignature(
  payloadB64: string,
  signatureB64: string,
  secret: string
): Promise<boolean> {
  const key = await importHmacKey(secret);
  return await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signatureB64),
    new TextEncoder().encode(payloadB64)
  );
}

export async function createSessionToken(
  email: string,
  ttlMs = DEFAULT_TTL_MS
): Promise<string> {
  const { current, kid } = getSigningSecrets();
  const normalized = normalizeUserId(email);
  const now = Date.now();
  const payload: SessionPayload = {
    email: normalized,
    iat: now,
    exp: now + ttlMs,
    kid,
  };
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = await signPayload(payloadB64, current);
  return `${TOKEN_PREFIX}.${payloadB64}.${signature}`;
}

async function verifyWithSecret(
  payloadB64: string,
  signature: string,
  secret: string
): Promise<SessionPayload> {
  const valid = await verifySignature(payloadB64, signature, secret);
  if (!valid) throw new UnauthorizedError();

  let payload: SessionPayload;
  try {
    payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    ) as SessionPayload;
  } catch {
    throw new UnauthorizedError();
  }

  if (!payload.email || typeof payload.exp !== "number") {
    throw new UnauthorizedError();
  }
  if (Date.now() > payload.exp) throw new UnauthorizedError();
  return payload;
}

export type VerifiedSession = { email: string; iat: number; exp: number };

/** Verify signature + expiry and return the normalized identity with issue time. */
export async function verifySessionTokenDetailed(token: string): Promise<VerifiedSession> {
  const trimmed = token.trim();
  if (!trimmed.startsWith(`${TOKEN_PREFIX}.`)) {
    throw new UnauthorizedError();
  }
  const body = trimmed.slice(TOKEN_PREFIX.length + 1);
  const dot = body.lastIndexOf(".");
  if (dot <= 0) throw new UnauthorizedError();
  const payloadB64 = body.slice(0, dot);
  const signature = body.slice(dot + 1);
  if (!payloadB64 || !signature) throw new UnauthorizedError();

  const { current, previous } = getSigningSecrets();
  let payload: SessionPayload;
  try {
    payload = await verifyWithSecret(payloadB64, signature, current);
  } catch (primaryError) {
    if (!previous) throw primaryError;
    payload = await verifyWithSecret(payloadB64, signature, previous);
  }
  return {
    email: normalizeUserId(payload.email),
    iat: typeof payload.iat === "number" ? payload.iat : 0,
    exp: payload.exp,
  };
}

export async function verifySessionToken(token: string): Promise<string> {
  return (await verifySessionTokenDetailed(token)).email;
}
