/**
 * AES-GCM token encryption for connector credentials at rest.
 * Key material stays on Convex (CONNECTOR_TOKEN_ENCRYPTION_KEY or SESSION_SIGNING_SECRET).
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function importAesKey(raw: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export function resolveConnectorEncryptionSecret(
  env: NodeJS.ProcessEnv = process.env
): string {
  const dedicated = env.CONNECTOR_TOKEN_ENCRYPTION_KEY?.trim();
  if (dedicated) return dedicated;
  const session = env.SESSION_SIGNING_SECRET?.trim();
  if (session) return session;
  throw new Error(
    "CONNECTOR_TOKEN_ENCRYPTION_KEY (or SESSION_SIGNING_SECRET) is required to store connector tokens."
  );
}

/** Encrypt plaintext → `v1.<iv_b64>.<ciphertext_b64>` */
export async function encryptSecret(
  plaintext: string,
  secret = resolveConnectorEncryptionSecret()
): Promise<string> {
  const key = await importAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipher))}`;
}

export async function decryptSecret(
  payload: string,
  secret = resolveConnectorEncryptionSecret()
): Promise<string> {
  const parts = payload.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new Error("Unsupported connector token ciphertext format.");
  }
  const iv = base64ToBytes(parts[1]!);
  const data = base64ToBytes(parts[2]!);
  const key = await importAesKey(secret);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return decoder.decode(plain);
}

export function randomUrlSafeToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToBase64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
