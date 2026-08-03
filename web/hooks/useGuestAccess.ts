"use client";

import { getSessionToken, getUserEmail } from "@/lib/auth";
import { useCallback, useEffect, useState } from "react";

const REQUIRE_AUTH_EVENT = "gigasocial:require-auth";

/** Session-aware guest helpers for UI gating only — does not alter auth logic. */
export function useGuestAccess() {
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    const refresh = () => {
      setIsGuest(!getSessionToken() || !getUserEmail());
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const requireAuth = useCallback(() => {
    window.dispatchEvent(new CustomEvent(REQUIRE_AUTH_EVENT));
  }, []);

  const guardAction = useCallback(
    (action: () => void | Promise<void>) => {
      if (isGuest) {
        requireAuth();
        return;
      }
      void action();
    },
    [isGuest, requireAuth]
  );

  return { isGuest, requireAuth, guardAction };
}
