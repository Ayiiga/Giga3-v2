import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SECURITY_EVENT_TYPES } from "../../convex/securityMonitoring";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

/** Slice a `export const NAME = ...` block up to the next top-level export. */
function exportBlock(src: string, name: string): string {
  const start = src.indexOf(`export const ${name} `);
  expect(start, `${name} should exist`).toBeGreaterThan(-1);
  const next = src.indexOf("\nexport ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

/** OWASP / API Security checklist coverage — static assertions for deployment review. */
describe("OWASP security checklist", () => {
  it("defines security event types for monitoring", () => {
    expect(SECURITY_EVENT_TYPES.AUTH_FAILURE).toBe("auth_failure");
    expect(SECURITY_EVENT_TYPES.UPLOAD_ABUSE).toBe("upload_abuse");
    expect(SECURITY_EVENT_TYPES.RATE_LIMIT).toBe("rate_limit");
    expect(SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY).toBe("suspicious_activity");
  });

  it("session tokens use a versioned prefix", () => {
    expect(read("convex/sessionAuth.ts")).toContain('const TOKEN_PREFIX = "giga3.v1"');
  });
});

describe("API Security Top 10 — no session minting from a bare email", () => {
  const users = read("convex/users.ts");
  const authActions = read("convex/authActions.ts");
  const passwordActions = read("convex/authPasswordActions.ts");

  it("users:createUser never returns a session token", () => {
    const block = exportBlock(users, "createUser");
    expect(block).toContain("mutation({");
    expect(block).not.toContain("createSessionToken");
    expect(block).not.toContain("attachSessionToken");
    expect(block).toContain("UnauthorizedError");
    expect(users).not.toContain("async function attachSessionToken");
  });

  it("establishSessionFromEmail and setPasswordForEmail are disabled stubs", () => {
    const fromEmail = exportBlock(authActions, "establishSessionFromEmail");
    expect(fromEmail).not.toContain("createSessionToken");
    expect(fromEmail).not.toContain("createUser");
    expect(fromEmail).toContain("UnauthorizedError");

    const setPw = exportBlock(passwordActions, "setPasswordForEmail");
    expect(setPw).not.toContain("issueSession");
    expect(setPw).not.toContain("setCredentialsInternal");
    expect(setPw).toContain("UnauthorizedError");
  });

  it("only verified flows mint sessions, via the internal user upsert", () => {
    expect(exportBlock(authActions, "establishSessionFromSupabase")).toContain(
      "verifySupabaseAccessToken"
    );
    expect(passwordActions).toContain(
      "await ctx.runMutation(internal.users.ensureUserInternal, { email });"
    );
    expect(passwordActions).not.toContain("api.users.createUser");
    for (const file of ["convex/platformActions.ts", "convex/aiActions.ts"]) {
      expect(read(file), file).not.toContain("api.users.createUser");
    }
    expect(users).toContain("export const ensureUserInternal = internalMutation");
  });

  it("session-issuing public functions require proof of ownership", () => {
    expect(exportBlock(passwordActions, "signInWithPassword")).toContain("verifyPassword(");
    expect(exportBlock(passwordActions, "resetPasswordWithToken")).toContain(
      "passwordResetTokenHash"
    );
    expect(exportBlock(users, "refreshSession")).toContain("requireSession(");
  });

  it("ops-only mutations are internal, not client-callable", () => {
    expect(users).toContain("export const backfillMissingStarterCredits = internalMutation");
    expect(read("convex/subscriptions.ts")).toContain(
      "export const runExpiryCheck = internalMutation"
    );
    expect(read("convex/platformStats.ts")).toContain(
      "export const incrementUserCount = internalMutation"
    );
  });

  it("web client no longer bootstraps sessions from a stored email", () => {
    const hook = read("web/hooks/useChatPlatform.ts");
    expect(hook).not.toContain("api.users.createUser");
  });
});
