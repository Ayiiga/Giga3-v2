import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  randomUrlSafeToken,
  resolveConnectorEncryptionSecret,
} from "../../convex/connectors/crypto";

describe("connector token crypto", () => {
  it("round-trips AES-GCM ciphertext", async () => {
    const secret = "test-connector-encryption-key-please-rotate";
    const cipher = await encryptSecret("access-token-value", secret);
    expect(cipher.startsWith("v1.")).toBe(true);
    expect(await decryptSecret(cipher, secret)).toBe("access-token-value");
  });

  it("fails closed on tampered ciphertext", async () => {
    const secret = "test-connector-encryption-key-please-rotate";
    const cipher = await encryptSecret("token", secret);
    await expect(decryptSecret(cipher + "x", secret)).rejects.toBeTruthy();
  });

  it("prefers CONNECTOR_TOKEN_ENCRYPTION_KEY over session secret", () => {
    expect(
      resolveConnectorEncryptionSecret({
        CONNECTOR_TOKEN_ENCRYPTION_KEY: "dedicated",
        SESSION_SIGNING_SECRET: "session",
      } as NodeJS.ProcessEnv)
    ).toBe("dedicated");
  });

  it("generates url-safe state tokens", () => {
    const token = randomUrlSafeToken(16);
    expect(token.length).toBeGreaterThan(10);
    expect(token).not.toMatch(/[+/=]/);
  });
});
