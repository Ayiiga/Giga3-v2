"use node";

import { UnauthorizedError } from "./securityErrors";
import { normalizeUserId } from "./userIds";

type SupabaseUserResponse = {
  id?: string;
  email?: string;
};

/**
 * Verifies a Supabase access token (magic-link / OAuth) via the Auth REST API.
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY on Convex.
 */
export async function verifySupabaseAccessToken(
  accessToken: string
): Promise<string> {
  const baseUrl = process.env.SUPABASE_URL?.trim()?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!baseUrl || !anonKey) {
    throw new UnauthorizedError("Magic-link authentication is not configured");
  }

  const res = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    throw new UnauthorizedError();
  }

  const user = (await res.json()) as SupabaseUserResponse;
  const email = user.email?.trim().toLowerCase();
  if (!email) throw new UnauthorizedError();
  return normalizeUserId(email);
}
