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
  getFrontendBaseUrl,
  isEmailDeliveryConfigured,
  sendEmail,
  wrapEmailHtml,
} from "./emailClient";
import { buildResetUrl, resolveResetBaseUrl } from "./authResetLinks";
import {
  buildPasswordResetMessage,
  buildResetOpsFailureNotice,
  publicPasswordResetResponse,
} from "./passwordResetMail";
import { RESET_TTL_MS, assessResetToken } from "./passwordResetPolicy";
import { SECURITY_EVENT_TYPES } from "./securityMonitoring";

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
      const user = await ctx.runQuery(internal.users.getUserByEmailInternal, { email });
      if (user?.googleSub) {
        throw new UnauthorizedError(
          "This account uses Google sign-in. Continue with Google, or use Forgot password to set a password."
        );
      }
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
      return { ...publicPasswordResetResponse(deliveryConfigured), emailed: false };
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
        return publicPasswordResetResponse(deliveryConfigured);
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
        return publicPasswordResetResponse(deliveryConfigured);
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
      return publicPasswordResetResponse(false);
    }

    const message = buildPasswordResetMessage(email, resetUrl);
    const sendResult = await sendEmail(message);
    if (!sendResult.ok) {
      console.error(
        `[authPassword] Password reset delivery failed reason=${sendResult.reason}`
      );
      const notice = buildResetOpsFailureNotice(email, sendResult.reason);
      if (notice) {
        await sendEmail(notice).catch(() => undefined);
      }
    }

    // Same payload whether or not this email has an account, and whether or
    // not delivery succeeded. The reset link was only addressed to `email`.
    return publicPasswordResetResponse(true);
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
    const assessment = assessResetToken({
      storedHash: creds?.passwordResetTokenHash,
      expiresAt: creds?.passwordResetExpiresAt,
      presentedToken: args.token,
      now: Date.now(),
    });
    if (assessment !== "ok") {
      if (assessment === "mismatch") {
        await logSecurityEvent(
          ctx,
          SECURITY_EVENT_TYPES.AUTH_FAILURE,
          "medium",
          "Password reset token mismatch",
          email
        );
      }
      throw new UnauthorizedError(
        assessment === "expired"
          ? "Reset link has expired. Request a new one."
          : "Reset link is invalid or expired."
      );
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
