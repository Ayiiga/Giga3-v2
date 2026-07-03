import { describe, expect, it } from "vitest";
import { validatePasswordShape } from "../../convex/passwordCrypto";
import {
  hashPassword,
  verifyPassword,
} from "../../convex/passwordCryptoNode";

describe("passwordCrypto", () => {
  it("rejects short passwords", () => {
    expect(validatePasswordShape("short")).toMatch(/at least/);
    expect(validatePasswordShape("longenough")).toBeNull();
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("my-secure-password");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("my-secure-password", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
