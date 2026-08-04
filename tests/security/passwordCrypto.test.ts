import { describe, expect, it } from "vitest";
import {
  passwordRequirementsHint,
  validatePasswordShape,
} from "../../convex/passwordCrypto";
import {
  hashPassword,
  verifyPassword,
} from "../../convex/passwordCryptoNode";

describe("passwordCrypto", () => {
  it("rejects short passwords", () => {
    expect(validatePasswordShape("short")).toMatch(/at least/);
  });

  it("requires a letter and a number", () => {
    expect(validatePasswordShape("longenough")).toMatch(/number/i);
    expect(validatePasswordShape("12345678")).toMatch(/letter/i);
    expect(validatePasswordShape("creat3more")).toBeNull();
  });

  it("exposes a clear requirements hint", () => {
    expect(passwordRequirementsHint()).toMatch(/letter/);
    expect(passwordRequirementsHint()).toMatch(/number/);
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("my-secure-password1");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("my-secure-password1", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
