import { createSign, generateKeyPairSync, type KeyObject } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  GOOGLE_JWKS_URL,
  GoogleTokenError,
  verifyGoogleIdToken,
  type GoogleJwk,
} from "../../convex/googleIdToken";

const CLIENT_ID = "1234567890-test.apps.googleusercontent.com";
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

function jwkFor(key: KeyObject, kid: string): GoogleJwk {
  const exported = key.export({ format: "jwk" }) as GoogleJwk;
  return {
    kty: exported.kty,
    n: exported.n,
    e: exported.e,
    alg: "RS256",
    use: "sig",
    kid,
  };
}

const signingJwk = jwkFor(publicKey, "test-key");

function b64url(value: Buffer | string): string {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString("base64url");
}

function signJwt(
  payload: Record<string, unknown>,
  options?: { kid?: string; alg?: string; key?: KeyObject }
): string {
  const header = b64url(
    JSON.stringify({ alg: options?.alg ?? "RS256", kid: options?.kid ?? "test-key", typ: "JWT" })
  );
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = createSign("RSA-SHA256").update(data).end().sign(options?.key ?? privateKey);
  return `${data}.${b64url(signature)}`;
}

function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    azp: CLIENT_ID,
    sub: "google-sub-1001",
    email: "New.User@Example.com",
    email_verified: true,
    name: "New User",
    picture: "https://lh3.googleusercontent.com/a/example",
    iat: 1_700_000_000,
    exp: 1_700_003_600,
    ...overrides,
  };
}

const nowMs = 1_700_000_100 * 1000;

function keys(forceRefresh = false) {
  void forceRefresh;
  return Promise.resolve([signingJwk]);
}

async function verify(token: string, audiences: string | string[] = CLIENT_ID) {
  return verifyGoogleIdToken(token, { audiences, nowMs, getKeys: keys });
}

describe("Google ID token verification", () => {
  it("accepts a valid token and uses sub plus the verified email", async () => {
    const identity = await verify(signJwt(claims()));
    expect(identity.sub).toBe("google-sub-1001");
    expect(identity.email).toBe("new.user@example.com");
    expect(identity.emailVerified).toBe(true);
    expect(identity.name).toBe("New User");
  });

  it("rejects an invalid signature", async () => {
    const token = signJwt(claims());
    const [h, p, sig] = token.split(".");
    const broken = `${h}.${p}.${sig.slice(0, -2)}${sig.endsWith("a") ? "b" : "a"}`;
    await expect(verify(broken)).rejects.toMatchObject({ reason: "signature" });
  });

  it("rejects an expired token", async () => {
    const token = signJwt(claims({ exp: 1_600_000_000 }));
    await expect(verify(token)).rejects.toMatchObject({ reason: "expired" });
  });

  it("rejects the wrong audience", async () => {
    const token = signJwt(claims({ aud: "other.apps.googleusercontent.com", azp: CLIENT_ID }));
    await expect(verify(token)).rejects.toMatchObject({ reason: "audience" });
  });

  it("rejects the wrong issuer", async () => {
    const token = signJwt(claims({ iss: "https://evil.example" }));
    await expect(verify(token)).rejects.toMatchObject({ reason: "issuer" });
  });

  it("rejects missing sub, email, or email_verified", async () => {
    await expect(verify(signJwt(claims({ sub: "" })))).rejects.toMatchObject({ reason: "claims" });
    await expect(verify(signJwt(claims({ email: undefined })))).rejects.toMatchObject({
      reason: "claims",
    });
    await expect(verify(signJwt(claims({ email_verified: false })))).rejects.toMatchObject({
      reason: "claims",
    });
    await expect(verify(signJwt(claims({ email_verified: "true" })))).rejects.toMatchObject({
      reason: "claims",
    });
  });

  it("rejects unsigned and non-RS256 tokens", async () => {
    const header = b64url(JSON.stringify({ alg: "none", kid: "test-key" }));
    const body = b64url(JSON.stringify(claims()));
    await expect(verify(`${header}.${body}.`)).rejects.toBeInstanceOf(GoogleTokenError);
    await expect(verify(signJwt(claims(), { alg: "HS256" }))).rejects.toMatchObject({
      reason: "signature",
    });
  });

  it("refreshes JWKS when the key id is new", async () => {
    let refreshes = 0;
    const identity = await verifyGoogleIdToken(signJwt(claims()), {
      audiences: CLIENT_ID,
      nowMs,
      getKeys: async (forceRefresh) => {
        if (forceRefresh) refreshes += 1;
        return forceRefresh ? [signingJwk] : [jwkFor(publicKey, "old-key")];
      },
    });
    expect(identity.sub).toBe("google-sub-1001");
    expect(refreshes).toBe(1);
  });

  it("loads certs from Google's JWKS endpoint", () => {
    expect(GOOGLE_JWKS_URL).toBe("https://www.googleapis.com/oauth2/v3/certs");
  });
});
