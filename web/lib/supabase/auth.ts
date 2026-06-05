"use client";

import { clearUserEmail, setUserEmail } from "@/lib/auth";
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

export async function syncSupabaseAuthToLocalEmail(): Promise<string | null> {
  const client = getSupabaseClient();
  const accessToken = consumeSupabaseAuthHash() ?? getStoredAccessToken();
  if (!client || !accessToken) return null;
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

