"use client";

import { setAuthSession } from "@/lib/auth";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";

type SessionResult = { email: string; sessionToken: string };

/**
 * Exchange a Google Identity Services ID token for a Giga3 session.
 * The ID token is sent once to Convex and is not stored in the browser.
 */
export async function signInWithGoogle(idToken: string): Promise<SessionResult> {
  const convexUrl = getConvexUrl();
  if (!convexUrl) throw new Error("Chat backend is not configured.");
  const result = await convexHttpCall<SessionResult>(
    convexUrl,
    "action",
    "googleAuthActions:signInWithGoogle",
    { idToken },
    { timeoutMs: 25_000, retries: 1 }
  );
  setAuthSession(result.email, result.sessionToken);
  return result;
}
