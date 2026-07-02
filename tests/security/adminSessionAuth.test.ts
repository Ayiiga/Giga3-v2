import { describe, expect, it, beforeAll } from "vitest";
import {
  createAdminSessionToken,
  isConfiguredAdminKey,
  verifyAdminSessionToken,
} from "../../convex/adminSessionAuth";

beforeAll(() => {
  process.env.PLATFORM_STATS_ADMIN_KEY = "test-admin-key-vitest";
  process.env.ADMIN_SESSION_SIGNING_SECRET = "admin-signing-secret-vitest";
});

describe("adminSessionAuth", () => {
  it("validates configured admin keys", () => {
    expect(isConfiguredAdminKey("test-admin-key-vitest")).toBe(true);
    expect(isConfiguredAdminKey("wrong")).toBe(false);
  });

  it("issues and verifies admin session tokens", async () => {
    const token = await createAdminSessionToken(60_000);
    await expect(verifyAdminSessionToken(token)).resolves.toBe(true);
  });

  it("rejects tampered admin session tokens", async () => {
    const token = await createAdminSessionToken(60_000);
    await expect(verifyAdminSessionToken(`${token}x`)).resolves.toBe(false);
  });
});
