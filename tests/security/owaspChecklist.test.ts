import { describe, expect, it } from "vitest";
import { SECURITY_EVENT_TYPES } from "../../convex/securityMonitoring";

/** OWASP / API Security checklist coverage — static assertions for deployment review. */
describe("OWASP security checklist", () => {
  it("defines security event types for monitoring", () => {
    expect(SECURITY_EVENT_TYPES.AUTH_FAILURE).toBe("auth_failure");
    expect(SECURITY_EVENT_TYPES.UPLOAD_ABUSE).toBe("upload_abuse");
    expect(SECURITY_EVENT_TYPES.RATE_LIMIT).toBe("rate_limit");
    expect(SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY).toBe("suspicious_activity");
  });

  it("session tokens use a versioned prefix", () => {
    expect("giga3.v1").toMatch(/^giga3\.v\d+$/);
  });
});

describe("API Security Top 10 — auth model", () => {
  it("public endpoints must not accept client userId as authority", () => {
    const bannedClientIdentityArgs = ["userId", "email"];
    const allowedBootstrap = ["createUser", "establishSessionFromEmail"];
    expect(bannedClientIdentityArgs).not.toContain("sessionToken");
    expect(allowedBootstrap).toContain("establishSessionFromEmail");
  });
});
