import { UnauthorizedError } from "./securityErrors";

const TOKEN_PREFIX = "giga3-admin-v1";
const DEFAULT_ADMIN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

type AdminSessionPayload = {
  role: "platform_admin";
  exp: number;
  iat: number;
};

function getAdminSigningSecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SIGNING_SECRET?.trim() ||
    process.env.SESSION_SIGNING_SECRET?.trim() ||
    process.env.PLATFORM_STATS_ADMIN_KEY?.trim() ||
    process.env.QUALITY_DASHBOARD_ADMIN_KEY?.trim();
  if (!secret) {
    throw new Error("Admin session signing is not configured");
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

export function isConfiguredAdminKey(adminKey: string): boolean {
  const key = adminKey.trim();
  if (!key) return false;
  const required =
    process.env.PLATFORM_STATS_ADMIN_KEY?.trim() ||
    process.env.QUALITY_DASHBOARD_ADMIN_KEY?.trim();
  return Boolean(required && key === required);
}

export async function createAdminSessionToken(
  ttlMs = DEFAULT_ADMIN_TTL_MS
): Promise<string> {
  const now = Date.now();
  const payload: AdminSessionPayload = {
    role: "platform_admin",
    iat: now,
    exp: now + ttlMs,
  };
  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = await signPayload(payloadB64, getAdminSigningSecret());
  return `${TOKEN_PREFIX}.${payloadB64}.${signature}`;
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  const trimmed = token.trim();
  const prefix = `${TOKEN_PREFIX}.`;
  if (!trimmed.startsWith(prefix)) return false;

  const rest = trimmed.slice(prefix.length);
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) return false;

  const payloadB64 = rest.slice(0, dot);
  const signature = rest.slice(dot + 1);
  const secret = getAdminSigningSecret();

  const valid = await verifySignature(payloadB64, signature, secret);
  if (!valid) return false;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    ) as AdminSessionPayload;
    if (payload.role !== "platform_admin") return false;
    if (!payload.exp || payload.exp <= Date.now()) {
      throw new UnauthorizedError("Admin session expired");
    }
    return true;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    return false;
  }
}
