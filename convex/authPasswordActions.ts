"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createSessionToken } from "./sessionAuth";
import { UnauthorizedError } from "./securityErrors";
import {
  passwordRequirementsHint,
  validatePasswordShape,
} from "./passwordCrypto";
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  verifyPassword,
} from "./passwordCryptoNode";
import {
  getEmailFallbackInbox,
  getFrontendBaseUrl,
  isEmailDeliveryConfigured,
  sendEmail,
  wrapEmailHtml,
} from "./emailClient";
import {
  buildResetUrl,
  constantTimeEqualHex,
  resolveResetBaseUrl,
} from "./authResetLinks";
import { SECURITY_EVENT_TYPES } from "./securityMonitoring";

const RESET_TTL_MS = 60 * 60 * 1000;

/** Per-email attempts per 15 minutes. Reset/sign-up are tighter than sign-in. */
const LIMITS = { signup: 5, signin: 10, reset: 4, resetComplete: 6 } as const;

async function logSecurityEvent(
  ctx: { runMutation: Function },
  eventType: string,
  severity: "low" | "medium" | "high",
  message: string,
  email?: string
) {
  await ctx
    .runMutation(internal.securityMonitoring.recordSecurityEvent, {
      eventType,
      severity,
      message,
      email,
    })
    .catch(() => null);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Only call after ownership of `email` has been proven (password, reset token). */
async function issueSession(
  ctx: { runMutation: Function },
  email: string
): Promise<{ email: string; sessionToken: string }> {
  await ctx.runMutation(internal.users.ensureUserInternal, { email });
  const sessionToken = await createSessionToken(email);
  return { email, sessionToken };
}

function buildResetEmailHtml(resetUrl: string): string {
  return wrapEmailHtml({
    title: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 14px;">We received a request to reset your Giga3 AI password.</p>
      <p style="margin:0 0 22px;">This link expires in <strong>1 hour</strong>.</p>
      <p style="margin:0 0 22px;">
        <a href="${resetUrl}"
           style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
          Reset password
        </a>
      </p>
      <p style="margin:0;font-size:14px;color:#5f7a76;">If the button does not work, copy and paste this link into your browser:</p>
      <p style="margin:8px 0 0;word-break:break-all;font-size:13px;"><a href="${resetUrl}" style="color:#0f766e;">${resetUrl}</a></p>
      <p style="margin:18px 0 0;font-size:14px;">If you did not request this, you can ignore this email — your password will stay the same.</p>
    `,
    footerHtml: `<p style="margin:0;">${passwordRequirementsHint()}</p>`,
  });
}

async function sendResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "Reset your Giga3 AI password",
    html: buildResetEmailHtml(resetUrl),
    text: `Reset your Giga3 AI password (expires in 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    tags: [
      { name: "category", value: "password_reset" },
      { name: "app", value: "giga3" },
    ],
  });
}

/**
 * When Resend sandbox/domain blocks the user inbox, email the working fallback
 * inbox with the same reset link so an admin can forward it immediately.
 */
async function sendResetEmailFallback(
  userEmail: string,
  resetUrl: string
): Promise<boolean> {
  const fallback = getEmailFallbackInbox();
  if (!fallback || fallback === userEmail) return false;

  const html = wrapEmailHtml({
    title: "Password reset (forward to user)",
    bodyHtml: `
      <p style="margin:0 0 12px;">Resend could not deliver directly to <strong>${userEmail}</strong> yet (domain not verified or sandbox limit).</p>
      <p style="margin:0 0 12px;">Forward this one-hour reset link to that user:</p>
      <p style="margin:0 0 22px;">
        <a href="${resetUrl}"
           style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
          Reset password for ${userEmail}
        </a>
      </p>
      <p style="margin:0;word-break:break-all;font-size:13px;"><a href="${resetUrl}" style="color:#0f766e;">${resetUrl}</a></p>
    `,
  });

  const result = await sendEmail({
    to: fallback,
    subject: `[Giga3] Password reset for ${userEmail} — please forward`,
    html,
    text: `Password reset for ${userEmail} (expires in 1 hour):\n${resetUrl}\n\nForward this link to the user. Verify giga3ai.com at resend.com/domains to enable direct delivery.`,
    tags: [
      { name: "category", value: "password_reset_fallback" },
      { name: "app", value: "giga3" },
    ],
  });

  if (result.ok) {
    console.warn(
      `[authPassword] Reset link for ${userEmail} emailed to fallback inbox ${fallback}`
    );
  }
  return result.ok;
}

async function sendWelcomeEmail(to: string): Promise<void> {
  if (!isEmailDeliveryConfigured()) return;
  const frontend = getFrontendBaseUrl();
  const html = wrapEmailHtml({
    title: "Welcome to Giga3 AI",
    bodyHtml: `
      <p style="margin:0 0 12px;">Your account is ready.</p>
      <p style="margin:0 0 12px;">Come back anytime to chat, learn, create, and share photo or video Stories on GigaSocial.</p>
      <ul style="margin:0 0 20px;padding-left:18px;">
        <li style="margin:0 0 6px;"><a href="${frontend}/chat/" style="color:#0f766e;">Chat &amp; ideas</a></li>
        <li style="margin:0 0 6px;"><a href="${frontend}/gigalearn/" style="color:#0f766e;">Learn with GigaLearn</a></li>
        <li style="margin:0 0 6px;"><a href="${frontend}/gigaedit/" style="color:#0f766e;">Create with GigaEdit</a></li>
        <li style="margin:0 0 6px;"><a href="${frontend}/gigasocial/" style="color:#0f766e;">GigaSocial Stories</a></li>
      </ul>
    `,
  });
  await sendEmail({
    to,
    subject: "Welcome to Giga3 AI — create, learn, and share",
    html,
    text: `Welcome to Giga3 AI. Open ${frontend}/chat/ to get started.`,
    tags: [
      { name: "category", value: "welcome" },
      { name: "app", value: "giga3" },
    ],
  });
}

/** Create account with email + password. */
export const signUpWithPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) throw new UnauthorizedError("Invalid email");

    const passwordError = validatePasswordShape(args.password);
    if (passwordError) throw new UnauthorizedError(passwordError);

    await ctx.runMutation(internal.passwordAuth.consumePasswordAuthRateLimit, {
      bucketKey: `signup:${email}`,
      maxAttempts: LIMITS.signup,
    });

    const hasCredentials = await ctx.runQuery(
      internal.passwordAuth.hasCredentialsInternal,
      { email }
    );
    if (hasCredentials) {
      throw new UnauthorizedError(
        "An account with this email already exists. Sign in instead."
      );
    }

    // A legacy email-only account (user row, no password yet) must be claimed
    // through the emailed reset link, never by whoever signs up first.
    const existingUser = await ctx.runQuery(internal.users.getUserByEmailInternal, {
      email,
    });
    if (existingUser) {
      await logSecurityEvent(
        ctx,
        SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        "medium",
        "Sign-up attempted for existing email-only account",
        email
      );
      throw new UnauthorizedError(
        "This email already has a Giga3 account. Use “Forgot password” and we will email you a link to set your password."
      );
    }

    const passwordHash = await hashPassword(args.password);
    await ctx.runMutation(internal.passwordAuth.setCredentialsInternal, {
      email,
      passwordHash,
    });

    const session = await issueSession(ctx, email);
    // Best-effort welcome — never block sign-up if mail fails.
    void sendWelcomeEmail(email).catch(() => undefined);
    return session;
  },
});

/** Sign in with email + password. */
export const signInWithPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) throw new UnauthorizedError("Invalid email");

    await ctx.runMutation(internal.passwordAuth.consumePasswordAuthRateLimit, {
      bucketKey: `signin:${email}`,
      maxAttempts: LIMITS.signin,
    });

    const creds = await ctx.runQuery(internal.passwordAuth.getCredentialsInternal, {
      email,
    });
    if (!creds) {
      throw new UnauthorizedError(
        "No password set for this email. Sign up or use forgot password."
      );
    }

    const valid = await verifyPassword(args.password, creds.passwordHash);
    if (!valid) {
      await logSecurityEvent(
        ctx,
        SECURITY_EVENT_TYPES.AUTH_FAILURE,
        "low",
        "Password sign-in failed",
        email
      );
      throw new UnauthorizedError("Incorrect email or password.");
    }

    return await issueSession(ctx, email);
  },
});

/**
 * Send password reset email.
 * Always returns ok:true for unknown emails (anti-enumeration).
 * `deliveryConfigured` / `emailed` help the UI show accurate guidance.
 */
export const requestPasswordReset = action({
  args: {
    email: v.string(),
    resetBaseUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const deliveryConfigured = isEmailDeliveryConfigured();

    if (!isValidEmail(email)) {
      return {
        ok: true as const,
        emailed: false,
        deliveryConfigured,
        accountMatched: true, // always true — never reveals account existence
      };
    }

    await ctx.runMutation(internal.passwordAuth.consumePasswordAuthRateLimit, {
      bucketKey: `reset:${email}`,
      maxAttempts: LIMITS.reset,
    });

    let creds = await ctx.runQuery(internal.passwordAuth.getCredentialsInternal, {
      email,
    });
    if (!creds) {
      const user = await ctx.runQuery(internal.users.getUserByEmailInternal, {
        email,
      });
      if (!user) {
        // Anti-enumeration: indistinguishable from the "link sent" response.
        return {
          ok: true as const,
          emailed: deliveryConfigured,
          deliveryConfigured,
          accountMatched: true,
        };
      }
      // Email-only accounts can set a password through the reset flow.
      const placeholderHash = await hashPassword(generateResetToken());
      await ctx.runMutation(internal.passwordAuth.setCredentialsInternal, {
        email,
        passwordHash: placeholderHash,
      });
      creds = await ctx.runQuery(internal.passwordAuth.getCredentialsInternal, {
        email,
      });
      if (!creds) {
        return {
          ok: true as const,
          emailed: false,
          deliveryConfigured,
          accountMatched: true, // always true — never reveals account existence
        };
      }
    }

    const token = generateResetToken();
    const tokenHash = hashResetToken(token);
    const expiresAt = Date.now() + RESET_TTL_MS;

    await ctx.runMutation(internal.passwordAuth.setPasswordResetInternal, {
      email,
      tokenHash,
      expiresAt,
    });

    const base = resolveResetBaseUrl({
      requestedBase: args.resetBaseUrl,
      frontendUrl: getFrontendBaseUrl(),
      allowLoopback: process.env.AUTH_ALLOW_LOOPBACK_RESET_LINKS === "true",
    });
    const resetUrl = buildResetUrl(base, token, email);
    await logSecurityEvent(
      ctx,
      SECURITY_EVENT_TYPES.SESSION_ROTATED,
      "low",
      "Password reset link issued",
      email
    );

    if (!deliveryConfigured) {
      console.error(
        "[authPassword] Password reset requested but RESEND_API_KEY is missing"
      );
      return {
        ok: true as const,
        emailed: false,
        deliveryConfigured: false,
        accountMatched: true,
      };
    }

    const sendResult = await sendResetEmail(email, resetUrl);
    if (sendResult.ok) {
      return {
        ok: true as const,
        emailed: true,
        deliveryConfigured: true,
        accountMatched: true,
      };
    }

    // Direct delivery blocked (typical before giga3ai.com is verified in Resend).
    // Fall back to the configured support inbox so the link is not lost.
    const canFallback =
      sendResult.reason === "sandbox_recipient" ||
      sendResult.reason === "domain_unverified" ||
      sendResult.reason === "provider_error";
    const fallbackOk = canFallback
      ? await sendResetEmailFallback(email, resetUrl)
      : false;

    // When support received the link, omit deliveryError so older PWA builds
    // (which only check deliveryError) do not show a hard red failure.
    if (fallbackOk) {
      return {
        ok: true as const,
        emailed: false,
        deliveryConfigured: true,
        accountMatched: true,
        supportNotified: true,
      };
    }

    return {
      ok: true as const,
      emailed: false,
      deliveryConfigured: true,
      accountMatched: true,
      deliveryError: sendResult.reason,
      supportNotified: false,
    };
  },
});

/** Complete password reset with token from email. */
export const resetPasswordWithToken = action({
  args: {
    email: v.string(),
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const passwordError = validatePasswordShape(args.newPassword);
    if (passwordError) throw new UnauthorizedError(passwordError);

    await ctx.runMutation(internal.passwordAuth.consumePasswordAuthRateLimit, {
      bucketKey: `reset-complete:${email}`,
      maxAttempts: LIMITS.resetComplete,
    });

    const creds = await ctx.runQuery(internal.passwordAuth.getCredentialsInternal, {
      email,
    });
    if (!creds?.passwordResetTokenHash || !creds.passwordResetExpiresAt) {
      throw new UnauthorizedError("Reset link is invalid or expired.");
    }
    if (Date.now() > creds.passwordResetExpiresAt) {
      throw new UnauthorizedError("Reset link has expired. Request a new one.");
    }

    const tokenHash = hashResetToken(args.token.trim());
    if (!constantTimeEqualHex(tokenHash, creds.passwordResetTokenHash)) {
      await logSecurityEvent(
        ctx,
        SECURITY_EVENT_TYPES.AUTH_FAILURE,
        "medium",
        "Password reset token mismatch",
        email
      );
      throw new UnauthorizedError("Reset link is invalid or expired.");
    }

    const passwordHash = await hashPassword(args.newPassword);
    // Single-use: updatePasswordHashInternal clears the token fields.
    await ctx.runMutation(internal.passwordAuth.updatePasswordHashInternal, {
      email,
      passwordHash,
    });
    // Anyone holding an older token (including whoever prompted the reset) is signed out.
    await ctx.runMutation(internal.users.revokeSessionsInternal, {
      email,
      reason: "password_reset",
    });

    return await issueSession(ctx, email);
  },
});

/**
 * @deprecated Let anyone set a password (and get a session) for an email-only
 * account without proving ownership. Disabled; `requestPasswordReset` already
 * covers first-time password setup through an emailed, expiring link.
 */
export const setPasswordForEmail = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async () => {
    throw new UnauthorizedError(
      "Use “Forgot password” — we will email you a secure link to set your password."
    );
  },
});

/** Public password policy hint for forms. */
export const getPasswordRequirements = action({
  args: {},
  handler: async () => ({
    minLength: 8,
    hint: passwordRequirementsHint(),
  }),
});
