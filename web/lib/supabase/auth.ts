"use client";

import {
  clearUserEmail,
  setAuthSession,
  setUserEmail,
} from "@/lib/auth";
import { getConvexUrl } from "@/lib/convex";
import { convexHttpCall } from "@/lib/network/convexCall";
import { getSupabaseClient } from "@/lib/supabase";

const ACCESS_TOKEN_KEY = "giga3_supabase_access_token";

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function storeAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function consumeSupabaseAuthHash(): string | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;
  storeAccessToken(accessToken);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return accessToken;
}

async function exchangeSupabaseTokenForGiga3Session(
  accessToken: string
): Promise<{ email: string; sessionToken: string } | null> {
  const convexUrl = getConvexUrl();
  if (!convexUrl) return null;
  try {
    const result = await convexHttpCall<{ email: string; sessionToken: string }>(
      convexUrl,
      "action",
      "authActions:establishSessionFromSupabase",
      { supabaseAccessToken: accessToken },
      { timeoutMs: 20_000, retries: 1 }
    );
    if (result?.email && result.sessionToken) {
      setAuthSession(result.email, result.sessionToken);
      return result;
    }
  } catch {
    return null;
  }
  return null;
}

export async function syncSupabaseAuthToLocalEmail(): Promise<string | null> {
  const client = getSupabaseClient();
  const accessToken = consumeSupabaseAuthHash() ?? getStoredAccessToken();
  if (!client || !accessToken) return null;

  const exchanged = await exchangeSupabaseTokenForGiga3Session(accessToken);
  if (exchanged) return exchanged.email;

  const { user } = await client.authGetUser(accessToken);
  const email = user?.email?.trim().toLowerCase() ?? null;
  if (email) setUserEmail(email);
  return email;
}

export async function signInWithSupabaseOtp(
  email: string,
  redirectTo?: string
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  await client.authSignInWithOtp(email.trim().toLowerCase(), redirectTo);
}

export async function signOutSupabase(): Promise<void> {
  const client = getSupabaseClient();
  const accessToken = getStoredAccessToken();
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  clearUserEmail();
  if (client && accessToken) {
    await client.authSignOut(accessToken).catch(() => null);
  }
}

/** Refresh Giga3 session token from stored Supabase access token. */
export async function refreshGiga3SessionFromSupabase(): Promise<string | null> {
  const accessToken = getStoredAccessToken();
  if (!accessToken) return null;
  const result = await exchangeSupabaseTokenForGiga3Session(accessToken);
  return result?.sessionToken ?? null;
}
