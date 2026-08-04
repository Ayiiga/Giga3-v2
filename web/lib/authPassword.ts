"use client";

import { setAuthSession } from "@/lib/auth";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";

type SessionResult = { email: string; sessionToken: string };

export type PasswordResetResult = {
  ok: boolean;
  emailed: boolean;
  deliveryConfigured?: boolean;
  accountMatched?: boolean;
  deliveryError?: string;
  /** True when Resend blocked the user inbox but support received the link. */
  supportNotified?: boolean;
};

async function authAction<T>(
  path: string,
  args: Record<string, unknown>
): Promise<T> {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("Chat backend is not configured.");
  return convexHttpCall<T>(convexUrl, "action", path, args, {
    timeoutMs: 25_000,
    retries: 2,
  });
}

export async function signUpWithPassword(
  email: string,
  password: string
): Promise<SessionResult> {
  const result = await authAction<SessionResult>(
    "authPasswordActions:signUpWithPassword",
    { email: email.trim().toLowerCase(), password }
  );
  setAuthSession(result.email, result.sessionToken);
  return result;
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<SessionResult> {
  const result = await authAction<SessionResult>(
    "authPasswordActions:signInWithPassword",
    { email: email.trim().toLowerCase(), password }
  );
  setAuthSession(result.email, result.sessionToken);
  return result;
}

export async function requestPasswordReset(
  email: string,
  resetBaseUrl?: string
): Promise<PasswordResetResult> {
  return authAction<PasswordResetResult>(
    "authPasswordActions:requestPasswordReset",
    {
      email: email.trim().toLowerCase(),
      ...(resetBaseUrl ? { resetBaseUrl } : {}),
    }
  );
}

export async function resetPasswordWithToken(
  email: string,
  token: string,
  newPassword: string
): Promise<SessionResult> {
  const result = await authAction<SessionResult>(
    "authPasswordActions:resetPasswordWithToken",
    {
      email: email.trim().toLowerCase(),
      token,
      newPassword,
    }
  );
  setAuthSession(result.email, result.sessionToken);
  return result;
}

export function passwordRequirementsHint(): string {
  return "Use at least 8 characters with a letter and a number.";
}
