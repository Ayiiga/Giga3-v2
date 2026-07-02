"use client";

import {
  adminCredentials,
  clearAdminSessionToken,
  getAdminSessionToken,
  setAdminSessionToken,
} from "@/lib/adminAuth";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
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
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState("");

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
    signOutAdmin,
    credentials: adminCredentials(),
  };
}
