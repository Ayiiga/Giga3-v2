"use client";

import { setAuthSession } from "@/lib/auth";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";

type SessionResult = { email: string; sessionToken: string };

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
  resetBaseUrl: string
): Promise<{ ok: boolean; emailed: boolean }> {
  return authAction<{ ok: boolean; emailed: boolean }>(
    "authPasswordActions:requestPasswordReset",
    { email: email.trim().toLowerCase(), resetBaseUrl }
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
