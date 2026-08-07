/**
 * Silent session restore — uses existing auth APIs only.
 * Does not change providers, Convex schema, or password/OTP flows.
 */

import {
  clearSessionToken,
  getSessionToken,
  getUserEmail,
  setSessionToken,
} from "@/lib/auth";
import { getConvexUrl } from "@/lib/convex/env";
import { convexHttpCall } from "@/lib/network/convexCall";

export type SessionRestoreResult =
  | { status: "ok"; sessionToken: string; email: string | null }
  | { status: "offline_cached"; sessionToken: string; email: string | null }
  | { status: "refreshed"; sessionToken: string; email: string | null }
  | { status: "unauthenticated" };

/** True when localStorage still holds a session token (sync, no network). */
export function hasPersistedSessionToken(): boolean {
  return Boolean(getSessionToken());
}

/** True when email + token are both present — treat as signed-in for UI gate. */
export function hasPersistedAuth(): boolean {
  return Boolean(getSessionToken() && getUserEmail());
}

async function trySupabaseSessionRefresh(): Promise<string | null> {
  try {
    const mod = await import("@/lib/supabase/auth");
    return await mod.refreshGiga3SessionFromSupabase();
  } catch {
    return null;
  }
}

/**
 * Attempt to keep the user signed in without showing login.
 * Order: rotate valid token → Supabase bridge refresh → email bootstrap.
 */
export async function restoreOrRefreshSession(options?: {
  bootstrapSession?: (email: string) => Promise<string | null>;
  allowOfflineCached?: boolean;
  online?: boolean;
}): Promise<SessionRestoreResult> {
  const email = getUserEmail();
  const token = getSessionToken();
  const online = options?.online ?? (typeof navigator === "undefined" ? true : navigator.onLine);
  const allowOffline = options?.allowOfflineCached !== false;

  if (token && !online && allowOffline) {
    return { status: "offline_cached", sessionToken: token, email };
  }

  if (token && online) {
    try {
      const convexUrl = getConvexUrl();
      if (convexUrl) {
        const rotated = await convexHttpCall<{ sessionToken: string }>(
          convexUrl,
          "mutation",
          "users:refreshSession",
          { sessionToken: token },
          { timeoutMs: 12_000, retries: 0 }
        );
        if (rotated?.sessionToken) {
          setSessionToken(rotated.sessionToken);
          return {
            status: "refreshed",
            sessionToken: rotated.sessionToken,
            email,
          };
        }
      }
    } catch {
      /* fall through */
    }
  }

  const fromSupabase = await trySupabaseSessionRefresh();
  if (fromSupabase) {
    return {
      status: "refreshed",
      sessionToken: fromSupabase,
      email: getUserEmail(),
    };
  }

  if (email && options?.bootstrapSession) {
    try {
      clearSessionToken();
      const next = await options.bootstrapSession(email);
      if (next) {
        setSessionToken(next);
        return { status: "refreshed", sessionToken: next, email };
      }
    } catch {
      /* continue */
    }
  }

  if (token && !online && allowOffline) {
    return { status: "offline_cached", sessionToken: token, email };
  }

  if (token) {
    return { status: "ok", sessionToken: token, email };
  }

  return { status: "unauthenticated" };
}

/**
 * After validateSession reports ok:false, try silent restore before logout redirect.
 */
export async function recoverInvalidSession(options: {
  bootstrapSession: (email: string) => Promise<string | null>;
  online: boolean;
}): Promise<SessionRestoreResult> {
  const email = getUserEmail();
  if (!options.online) {
    const token = getSessionToken();
    if (token) {
      return { status: "offline_cached", sessionToken: token, email };
    }
    return { status: "unauthenticated" };
  }

  const fromSupabase = await trySupabaseSessionRefresh();
  if (fromSupabase) {
    return {
      status: "refreshed",
      sessionToken: fromSupabase,
      email: getUserEmail(),
    };
  }

  if (email) {
    try {
      clearSessionToken();
      const next = await options.bootstrapSession(email);
      if (next) {
        setSessionToken(next);
        return { status: "refreshed", sessionToken: next, email };
      }
    } catch {
      /* continue */
    }
  }

  return { status: "unauthenticated" };
}
