import { describe, expect, it, beforeAll } from "vitest";
import { createSessionToken, verifySessionToken } from "../../convex/sessionAuth";
import { requireSession } from "../../convex/auth";
import { UnauthorizedError } from "../../convex/securityErrors";

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

  it("verifies tokens signed with the previous secret during rotation", async () => {
    process.env.SESSION_SIGNING_SECRET = "new-secret-key-for-rotation";
    process.env.SESSION_SIGNING_SECRET_PREVIOUS = "test-secret-key-for-vitest-only";
    const token = await createSessionToken("rotate@example.com");
    const email = await verifySessionToken(token);
    expect(email).toBe("rotate@example.com");
    delete process.env.SESSION_SIGNING_SECRET_PREVIOUS;
    process.env.SESSION_SIGNING_SECRET = "test-secret-key-for-vitest-only";
  });
});

describe("requireSession", () => {
  it("derives email from session token only", async () => {
    const token = await createSessionToken("owner@example.com");
    const email = await requireSession(token);
    expect(email).toBe("owner@example.com");
  });

  it("returns 401 without a session token", async () => {
    await expect(requireSession(undefined)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
