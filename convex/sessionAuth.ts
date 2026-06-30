import { normalizeUserId } from "./userIds";
import { UnauthorizedError } from "./securityErrors";

const TOKEN_PREFIX = "giga3.v1";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type SessionPayload = {
  email: string;
  exp: number;
  iat: number;
};

function getSigningSecret(): string {
  const secret =
    process.env.SESSION_SIGNING_SECRET?.trim() ||
    process.env.ADMIN_SETTINGS_KEY?.trim();
  if (!secret) {
    throw new Error("Session signing is not configured");
  }
  return secret;
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
  const normalized = normalizeUserId(email);
  const now = Date.now();
  const payload: SessionPayload = {
    email: normalized,
    iat: now,
    exp: now + ttlMs,
  };
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = await signPayload(payloadB64, getSigningSecret());
  return `${TOKEN_PREFIX}.${payloadB64}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<string> {
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
  const valid = await verifySignature(payloadB64, signature, getSigningSecret());
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
  return normalizeUserId(payload.email);
}
