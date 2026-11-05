import { afterEach, describe, expect, it } from "vitest";
import { ensureAdminAccess } from "../../convex/adminAccess";
import { createAdminSessionToken } from "../../convex/adminSessionAuth";

const ENV_KEYS = [
  "PLATFORM_STATS_ADMIN_KEY",
  "QUALITY_DASHBOARD_ADMIN_KEY",
  "ADMIN_SESSION_SIGNING_SECRET",
  "SESSION_SIGNING_SECRET",
] as const;

const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]])
);

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("GigaSEO admin access guard", () => {
  it("rejects requests without credentials", async () => {
    await expect(ensureAdminAccess({})).rejects.toThrow("Unauthorized");
  });

  it("rejects an incorrect legacy admin key", async () => {
    process.env.PLATFORM_STATS_ADMIN_KEY = "correct-secret";
    await expect(ensureAdminAccess({ adminKey: "wrong-secret" })).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("accepts only the configured legacy admin key", async () => {
    process.env.PLATFORM_STATS_ADMIN_KEY = "correct-secret";
    await expect(
      ensureAdminAccess({ adminKey: "correct-secret" })
    ).resolves.toBeUndefined();
  });

  it("accepts a valid signed admin session and rejects a tampered token", async () => {
    process.env.ADMIN_SESSION_SIGNING_SECRET = "test-signing-secret";
    const token = await createAdminSessionToken();
    await expect(
      ensureAdminAccess({ adminSessionToken: token })
    ).resolves.toBeUndefined();
    await expect(
      ensureAdminAccess({ adminSessionToken: token + "tampered" })
    ).rejects.toThrow("Unauthorized");
  });
});
