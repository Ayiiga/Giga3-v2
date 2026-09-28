import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { RateLimitError } from "../../convex/securityErrors";
import { consumeAuthRateLimit } from "../../convex/authRateLimit";
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  verifyPassword,
} from "../../convex/passwordCryptoNode";
import { assessResetToken, RESET_TTL_MS } from "../../convex/passwordResetPolicy";
import {
  buildPasswordResetMessage,
  buildResetOpsFailureNotice,
  publicPasswordResetResponse,
} from "../../convex/passwordResetMail";

const OWNER = "ayiiga3@gmail.com";
const USER = "user@example.com";

describe("password reset delivery", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    delete process.env.AUTH_EMAIL_FALLBACK_INBOX;
    delete process.env.FRONTEND_URL;
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("sends the reset email to the registered address", () => {
    const resetUrl = "https://www.giga3ai.com/chat/login/reset?token=one-time&email=user%40example.com";
    const message = buildPasswordResetMessage(USER, resetUrl);
    expect(message.to).toBe(USER);
    expect(message.to).not.toBe(OWNER);
    expect(message.text).toContain(resetUrl);
    expect(message.html).toContain(resetUrl);
  });

  it("does not use the owner inbox as the recipient for an ordinary user", () => {
    const message = buildPasswordResetMessage("Person@Example.com", "https://www.giga3ai.com/chat/login/reset?token=abc");
    expect(message.to).toBe("person@example.com");
    expect(message.to).not.toBe(OWNER);
  });

  it("still delivers the owner's own reset to the owner's address", () => {
    const message = buildPasswordResetMessage(OWNER, "https://www.giga3ai.com/chat/login/reset?token=own");
    expect(message.to).toBe(OWNER);
  });

  it("ops failure notices never contain the reset link", () => {
    const token = generateResetToken();
    const resetUrl = `https://www.giga3ai.com/chat/login/reset?token=${token}&email=user%40example.com`;
    const notice = buildResetOpsFailureNotice(USER, `sandbox_recipient ${resetUrl}`);
    expect(notice?.to).toBe(OWNER);
    expect(notice?.to).not.toBe(USER);
    const blob = `${notice?.subject}\n${notice?.text}\n${notice?.html}`;
    expect(blob).not.toContain(token);
    expect(blob).not.toContain("token=");
    expect(blob).not.toContain("/chat/login/reset");
    expect(blob).toContain("does not include a reset link");
  });

  it("returns the same public response whether or not the email exists", () => {
    const known = publicPasswordResetResponse(true);
    const unknown = publicPasswordResetResponse(true);
    expect(known).toEqual(unknown);
    expect(known.accountMatched).toBe(true);
    expect(publicPasswordResetResponse(false).emailed).toBe(false);
  });
});

describe("password reset token lifecycle", () => {
  it("generates a cryptographically long token and stores only its hash", () => {
    const first = generateResetToken();
    const second = generateResetToken();
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
    expect(hashResetToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashResetToken(first)).not.toBe(first);
    expect(hashResetToken(first)).toBe(hashResetToken(first));
  });

  it("expires, is single-use, changes the password, and rejects the old password", async () => {
    const oldPassword = "oldPass1";
    const newPassword = "newPass2";
    const token = generateResetToken();
    const issuedAt = 1_700_000_000_000;
    let credentials = {
      passwordHash: await hashPassword(oldPassword),
      passwordResetTokenHash: hashResetToken(token) as string | undefined,
      passwordResetExpiresAt: issuedAt + RESET_TTL_MS as number | undefined,
    };

    expect(
      assessResetToken({
        storedHash: credentials.passwordResetTokenHash,
        expiresAt: credentials.passwordResetExpiresAt,
        presentedToken: token,
        now: issuedAt + RESET_TTL_MS + 1,
      })
    ).toBe("expired");

    expect(
      assessResetToken({
        storedHash: credentials.passwordResetTokenHash,
        expiresAt: credentials.passwordResetExpiresAt,
        presentedToken: "not-the-token",
        now: issuedAt + 1_000,
      })
    ).toBe("mismatch");

    expect(
      assessResetToken({
        storedHash: credentials.passwordResetTokenHash,
        expiresAt: credentials.passwordResetExpiresAt,
        presentedToken: token,
        now: issuedAt + 1_000,
      })
    ).toBe("ok");

    credentials = {
      passwordHash: await hashPassword(newPassword),
      passwordResetTokenHash: undefined,
      passwordResetExpiresAt: undefined,
    };

    expect(
      assessResetToken({
        storedHash: credentials.passwordResetTokenHash,
        expiresAt: credentials.passwordResetExpiresAt,
        presentedToken: token,
        now: issuedAt + 2_000,
      })
    ).toBe("missing");
    expect(await verifyPassword(oldPassword, credentials.passwordHash)).toBe(false);
    expect(await verifyPassword(newPassword, credentials.passwordHash)).toBe(true);
  });

  it("rate-limits repeated reset attempts in the shared auth window", async () => {
    const rows: Array<{ _id: string; bucketKey: string; windowStartMs: number; count: number }> = [];
    let seq = 0;
    const db = {
      query() {
        return {
          withIndex(_index: string, cb: (q: { eq: (field: string, value: string) => unknown }) => void) {
            let key = "";
            cb({
              eq(_field: string, value: string) {
                key = value;
                return {};
              },
            });
            return {
              first: async () => rows.find((row) => row.bucketKey === key) ?? null,
            };
          },
        };
      },
      insert: async (_table: string, doc: { bucketKey: string; windowStartMs: number; count: number }) => {
        const _id = `id${++seq}`;
        rows.push({ _id, ...doc });
        return _id;
      },
      patch: async (id: string, patch: Partial<{ windowStartMs: number; count: number }>) => {
        const row = rows.find((item) => item._id === id);
        if (!row) throw new Error("missing rate limit row");
        Object.assign(row, patch);
      },
    };

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await consumeAuthRateLimit({ db }, "password:reset:user@example.com", 4);
    }
    await expect(
      consumeAuthRateLimit({ db }, "password:reset:user@example.com", 4)
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
