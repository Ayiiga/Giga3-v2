"use client";

import {
  adminCredentials,
  clearAdminSessionToken,
  getAdminSessionToken,
  setAdminSessionToken,
} from "@/lib/adminAuth";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Manages short-lived admin bearer tokens in sessionStorage.
 * Legacy ?key= URLs are exchanged once, then stripped from the address bar.
 */
export function useAdminSession() {
  const params = useSearchParams();
  const router = useRouter();
  const exchangeAdminKey = useMutation(api.adminAuth.exchangeAdminKey);
  const exchangeUserSessionForAdmin = useMutation(api.adminAuth.exchangeUserSessionForAdmin);
  const sessionToken = getSessionToken();
  const platformAdminCheck = useQuery(
    api.adminAuth.isCurrentUserPlatformAdmin,
    sessionToken ? { sessionToken } : "skip"
  );
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState("");
  const [accountPending, setAccountPending] = useState(false);

  const establishSession = useCallback(
    async (adminKey: string) => {
      setError(null);
      try {
        const result = await exchangeAdminKey({ adminKey: adminKey.trim() });
        setAdminSessionToken(result.adminSessionToken);
        setAuthorized(true);
        return true;
      } catch {
        clearAdminSessionToken();
        setAuthorized(false);
        setError("Unauthorized. Check your admin key.");
        return false;
      }
    },
    [exchangeAdminKey]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const urlKey = params.get("key")?.trim() ?? "";
      const existing = getAdminSessionToken();

      if (urlKey) {
        const ok = await establishSession(urlKey);
        if (cancelled) return;
        if (ok) {
          const path = window.location.pathname;
          router.replace(path);
        }
        setReady(true);
        return;
      }

      if (existing) {
        setAuthorized(true);
      }
      setReady(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [params, router, establishSession]);

  const submitKey = useCallback(async () => {
    if (!pendingKey.trim()) {
      setError("Enter your admin key.");
      return false;
    }
    const ok = await establishSession(pendingKey);
    if (ok) setPendingKey("");
    return ok;
  }, [pendingKey, establishSession]);

  const submitAccountSignIn = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setError("Sign in to your Giga3 account first.");
      return false;
    }
    setAccountPending(true);
    setError(null);
    try {
      const result = await exchangeUserSessionForAdmin({ sessionToken: token });
      setAdminSessionToken(result.adminSessionToken);
      setAuthorized(true);
      return true;
    } catch {
      clearAdminSessionToken();
      setAuthorized(false);
      setError("This account is not authorized for admin access.");
      return false;
    } finally {
      setAccountPending(false);
    }
  }, [exchangeUserSessionForAdmin]);

  const signOutAdmin = useCallback(() => {
    clearAdminSessionToken();
    setAuthorized(false);
  }, []);

  return {
    ready,
    authorized,
    error,
    pendingKey,
    setPendingKey,
    submitKey,
    submitAccountSignIn,
    canUseAccountSignIn: platformAdminCheck?.isAdmin === true,
    accountSignInPending: accountPending,
    signOutAdmin,
    credentials: adminCredentials(),
  };
}
