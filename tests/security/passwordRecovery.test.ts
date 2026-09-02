import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildResetUrl,
  constantTimeEqualHex,
  resolveResetBaseUrl,
} from "../../convex/authResetLinks";

const FRONTEND = "https://www.giga3ai.com";
const DEFAULT = `${FRONTEND}/chat/login/reset`;
const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("resolveResetBaseUrl — reset links can only point at our origin", () => {
  it("accepts the exact frontend origin and pins the reset path", () => {
    expect(
      resolveResetBaseUrl({ requestedBase: `${FRONTEND}/chat/login/reset`, frontendUrl: FRONTEND })
    ).toBe(DEFAULT);
    expect(
      resolveResetBaseUrl({ requestedBase: `${FRONTEND}/anything/else`, frontendUrl: FRONTEND })
    ).toBe(DEFAULT);
  });

  it("rejects look-alike hosts that merely start with the frontend URL", () => {
    for (const evil of [
      "https://www.giga3ai.com.evil.com/chat/login/reset",
      "https://www.giga3ai.com@evil.com/",
      "https://www.giga3ai.com.evil.com",
      "https://evil.com/https://www.giga3ai.com/",
      "https://wwwXgiga3ai.com/",
    ]) {
      expect(resolveResetBaseUrl({ requestedBase: evil, frontendUrl: FRONTEND }), evil).toBe(
        DEFAULT
      );
    }
  });

  it("rejects other schemes, subdomains, ports and garbage", () => {
    for (const bad of [
      "javascript:alert(1)",
      "http://www.giga3ai.com/",
      "https://app.giga3ai.com/",
      "https://www.giga3ai.com:8443/",
      "not a url",
      "",
    ]) {
      expect(resolveResetBaseUrl({ requestedBase: bad, frontendUrl: FRONTEND }), bad).toBe(DEFAULT);
    }
    expect(resolveResetBaseUrl({ frontendUrl: FRONTEND })).toBe(DEFAULT);
  });

  it("allows loopback only when explicitly enabled (local development)", () => {
    const local = "http://localhost:3000/chat/login/reset";
    expect(resolveResetBaseUrl({ requestedBase: local, frontendUrl: FRONTEND })).toBe(DEFAULT);
    expect(
      resolveResetBaseUrl({ requestedBase: local, frontendUrl: FRONTEND, allowLoopback: true })
    ).toBe("http://localhost:3000/chat/login/reset");
    expect(
      resolveResetBaseUrl({
        requestedBase: "https://evil.com/localhost",
        frontendUrl: FRONTEND,
        allowLoopback: true,
      })
    ).toBe(DEFAULT);
  });

  it("builds an encoded reset URL", () => {
    expect(buildResetUrl(DEFAULT, "ab/c+d", "a+b@x.com")).toBe(
      `${DEFAULT}?token=ab%2Fc%2Bd&email=a%2Bb%40x.com`
    );
  });
});

describe("constantTimeEqualHex", () => {
  it("compares equal-length digests without early exit and rejects mismatches", () => {
    const a = "9f".repeat(32);
    expect(constantTimeEqualHex(a, a)).toBe(true);
    expect(constantTimeEqualHex(a, "9f".repeat(31) + "9e")).toBe(false);
    expect(constantTimeEqualHex(a, a.slice(1))).toBe(false);
    expect(constantTimeEqualHex("", "")).toBe(false);
    // @ts-expect-error runtime guard
    expect(constantTimeEqualHex(undefined, a)).toBe(false);
  });
});

describe("password recovery and account flows — source invariants", () => {
  const actions = read("convex/authPasswordActions.ts");
  const block = (name: string) => {
    const start = actions.indexOf(`export const ${name} `);
    expect(start, name).toBeGreaterThan(-1);
    const next = actions.indexOf("\nexport ", start + 1);
    return actions.slice(start, next === -1 ? undefined : next);
  };

  it("sign-up cannot claim an existing email-only account", () => {
    const signUp = block("signUpWithPassword");
    expect(signUp).toContain("internal.users.getUserByEmailInternal");
    expect(signUp).toContain("Forgot password");
    expect(signUp).toContain("maxAttempts: LIMITS.signup");
  });

  it("reset requests do not reveal whether an account exists", () => {
    const reset = block("requestPasswordReset");
    expect(reset).not.toContain("accountMatched: false");
    expect(reset).toContain("resolveResetBaseUrl(");
    expect(reset).not.toMatch(/startsWith\(frontend\)/);
    expect(reset).toContain("maxAttempts: LIMITS.reset");
  });

  it("reset completion uses constant-time compare, is single-use and revokes old sessions", () => {
    const complete = block("resetPasswordWithToken");
    expect(complete).toContain("constantTimeEqualHex(tokenHash, creds.passwordResetTokenHash)");
    expect(complete).not.toMatch(/tokenHash !== creds\.passwordResetTokenHash/);
    expect(complete).toContain("internal.users.revokeSessionsInternal");
    expect(read("convex/passwordAuth.ts")).toMatch(
      /updatePasswordHashInternal[\s\S]*passwordResetTokenHash: undefined/
    );
  });

  it("session revocation is enforced by requireSession when a ctx is supplied", () => {
    const auth = read("convex/auth.ts");
    expect(auth).toContain("sessionsValidAfter");
    expect(auth).toContain("session.iat < validAfter");
    const users = read("convex/users.ts");
    expect(users).toContain("export const revokeSessionsInternal = internalMutation");
    expect(users).toContain("export const signOutEverywhere = mutation");
    expect(users).toMatch(/refreshSession[\s\S]*requireSession\(args\.sessionToken, ctx\)/);
    expect(users).toMatch(/validateSession[\s\S]*tryRequireSession\(args\.sessionToken, ctx\)/);
    for (const file of [
      "convex/paystack.ts",
      "convex/subscriptions.ts",
      "convex/chatMessaging.ts",
      "convex/credits.ts",
      "convex/gigaWallet.ts",
      "convex/marketplace.ts",
    ]) {
      expect(read(file), file).not.toMatch(/requireSession\(args\.sessionToken\)/);
    }
    expect(read("convex/schema.ts")).toContain("sessionsValidAfter: v.optional(v.number())");
  });

  it("session signing fails closed without SESSION_SIGNING_SECRET", () => {
    const sessionAuth = read("convex/sessionAuth.ts");
    expect(sessionAuth).not.toContain("ADMIN_SETTINGS_KEY");
    expect(sessionAuth).toContain("Fail closed");
  });

  it("admin key exchange is constant-time and rate limited", () => {
    expect(read("convex/adminSessionAuth.ts")).toContain("constantTimeEqual(key, required)");
    const adminAuth = read("convex/adminAuth.ts");
    expect(adminAuth).toContain('consumeAuthRateLimit(ctx, "admin:exchange-key"');
  });

  it("payments never fulfil on amount or currency mismatch", () => {
    const paystack = read("convex/paystack.ts");
    expect(paystack).toContain('currency !== "GHS"');
    expect(paystack).toContain('eventType: "payment_amount_mismatch"');
    expect(paystack).not.toMatch(/strictAmountCheck:\s*false/);
    expect(paystack).not.toMatch(/if \(strict\) throw/);
  });

  it("Stripe confirmation requires the buyer's own session", () => {
    const stripe = read("convex/stripeActions.ts");
    expect(stripe).toMatch(/confirmPurchase[\s\S]*requireSession\(args\.sessionToken, ctx\)/);
    expect(stripe).toContain("belongs to a different account");
  });
});
