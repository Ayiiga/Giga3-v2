"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { createSessionToken } from "./sessionAuth";
import { UnauthorizedError } from "./securityErrors";
import { validatePasswordShape } from "./passwordCrypto";
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  verifyPassword,
} from "./passwordCryptoNode";

const RESET_TTL_MS = 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function issueSession(
  ctx: { runMutation: Function },
  email: string
): Promise<{ email: string; sessionToken: string }> {
  await ctx.runMutation(api.users.createUser, { email });
  const sessionToken = await createSessionToken(email);
  return { email, sessionToken };
}

async function sendResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;
  const from =
    process.env.AUTH_FROM_EMAIL?.trim() || "Giga3 AI <noreply@giga3ai.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Reset your Giga3 AI password",
        html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
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

    const hasCredentials = await ctx.runQuery(
      internal.passwordAuth.hasCredentialsInternal,
      { email }
    );
    if (hasCredentials) {
      throw new UnauthorizedError("An account with this email already exists. Sign in instead.");
    }

    const passwordHash = await hashPassword(args.password);
    await ctx.runMutation(internal.passwordAuth.setCredentialsInternal, {
      email,
      passwordHash,
    });

    return await issueSession(ctx, email);
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

    const creds = await ctx.runQuery(internal.passwordAuth.getCredentialsInternal, {
      email,
    });
    if (!creds) {
      throw new UnauthorizedError("No password set for this email. Sign up or use forgot password.");
    }

    const valid = await verifyPassword(args.password, creds.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Incorrect email or password.");
    }

    return await issueSession(ctx, email);
  },
});

/** Send password reset email (always returns success to avoid email enumeration). */
export const requestPasswordReset = action({
  args: {
    email: v.string(),
    resetBaseUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      return { ok: true as const, emailed: false };
    }

    let creds = await ctx.runQuery(internal.passwordAuth.getCredentialsInternal, {
      email,
    });
    if (!creds) {
      const user = await ctx.runQuery(internal.users.getUserByEmailInternal, {
        email,
      });
      if (!user) {
        return { ok: true as const, emailed: false };
      }
      const placeholderHash = await hashPassword(generateResetToken());
      await ctx.runMutation(internal.passwordAuth.setCredentialsInternal, {
        email,
        passwordHash: placeholderHash,
      });
      creds = await ctx.runQuery(internal.passwordAuth.getCredentialsInternal, {
        email,
      });
      if (!creds) {
        return { ok: true as const, emailed: false };
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

    const base = args.resetBaseUrl.replace(/\/$/, "");
    const resetUrl = `${base}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    const emailed = await sendResetEmail(email, resetUrl);

    return { ok: true as const, emailed };
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
    if (tokenHash !== creds.passwordResetTokenHash) {
      throw new UnauthorizedError("Reset link is invalid or expired.");
    }

    const passwordHash = await hashPassword(args.newPassword);
    await ctx.runMutation(internal.passwordAuth.updatePasswordHashInternal, {
      email,
      passwordHash,
    });

    return await issueSession(ctx, email);
  },
});

/** Set password on existing email-only account (first-time password setup via reset flow). */
export const setPasswordForEmail = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const passwordError = validatePasswordShape(args.password);
    if (passwordError) throw new UnauthorizedError(passwordError);

    const hasCredentials = await ctx.runQuery(
      internal.passwordAuth.hasCredentialsInternal,
      { email }
    );
    if (hasCredentials) {
      throw new UnauthorizedError("Password already set. Use sign in or forgot password.");
    }

    const passwordHash = await hashPassword(args.password);
    await ctx.runMutation(internal.passwordAuth.setCredentialsInternal, {
      email,
      passwordHash,
    });

    return await issueSession(ctx, email);
  },
});
