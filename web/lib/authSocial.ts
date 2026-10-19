"use client";

import { getSessionToken, setAuthSession } from "@/lib/auth";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";

export type SocialProvider = "apple" | "microsoft" | "github";

type SessionResult = { email: string; sessionToken: string };

export async function beginSocialOAuth(
  provider: SocialProvider,
  returnPath = "/chat/",
  link = false
): Promise<{ authorizeUrl: string }> {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("Chat backend is not configured.");
  const sessionToken = link ? getSessionToken() : undefined;
  if (link && !sessionToken) {
    throw new Error("Sign in before linking a provider.");
  }
  return await convexHttpCall<{ authorizeUrl: string }>(
    convexUrl,
    "action",
    "socialAuth/oauth:beginSocialOAuth",
    {
      provider,
      returnPath,
      ...(sessionToken ? { sessionToken } : {}),
    },
    { timeoutMs: 20_000, retries: 1 }
  );
}

export async function exchangeSocialAuthCode(code: string): Promise<SessionResult> {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("Chat backend is not configured.");
  const result = await convexHttpCall<SessionResult>(
    convexUrl,
    "action",
    "socialAuth/oauth:exchangeSocialAuthCode",
    { code },
    { timeoutMs: 20_000, retries: 0 }
  );
  setAuthSession(result.email, result.sessionToken);
  return result;
}

export function socialAuthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "account_exists_requires_link":
      return "An account with this email already exists. Sign in with your password, then link this provider from Settings.";
    case "invalid_state":
    case "missing_code":
      return "Sign-in was interrupted. Please try again.";
    case "oauth_failed":
      return "Provider sign-in failed. Try again or use email and password.";
    case "not_configured":
      return "This sign-in provider is not configured yet.";
    case "email_mismatch_for_link":
      return "The provider email does not match your signed-in account.";
    default:
      return "Social sign-in could not be completed.";
  }
}
