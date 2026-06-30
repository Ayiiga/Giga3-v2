import { describe, expect, it, beforeAll } from "vitest";
import { createSessionToken, verifySessionToken } from "../../convex/sessionAuth";
import { requireAuthenticatedEmail } from "../../convex/auth";
import { ForbiddenError, UnauthorizedError } from "../../convex/securityErrors";

beforeAll(() => {
  process.env.SESSION_SIGNING_SECRET = "test-secret-key-for-vitest-only";
});

describe("sessionAuth", () => {
  it("issues and verifies a session token", async () => {
    const token = await createSessionToken("user@example.com");
    const email = await verifySessionToken(token);
    expect(email).toBe("user@example.com");
  });

  it("rejects tampered tokens", async () => {
    const token = await createSessionToken("user@example.com");
    const tampered = `${token}x`;
    await expect(verifySessionToken(tampered)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("requireAuthenticatedEmail", () => {
  it("derives email from session token and ignores matching userId", async () => {
    const token = await createSessionToken("owner@example.com");
    const email = await requireAuthenticatedEmail(token, "owner@example.com");
    expect(email).toBe("owner@example.com");
  });

  it("returns 403 when claimed userId does not match token", async () => {
    const token = await createSessionToken("owner@example.com");
    await expect(
      requireAuthenticatedEmail(token, "attacker@example.com")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns 401 without a session token", async () => {
    await expect(requireAuthenticatedEmail(undefined)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });
});
