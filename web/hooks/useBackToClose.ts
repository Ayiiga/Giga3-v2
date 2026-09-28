"use client";

import { useEffect, useRef } from "react";

const TOKEN_KEY = "__giga3BackToClose";

function currentToken(): unknown {
  return (window.history.state as Record<string, unknown> | null)?.[TOKEN_KEY];
}

/**
 * While `active`, the browser/Android Back button closes an in-page view instead of
 * leaving the route. One history entry per open; closing from the UI removes it again.
 */
export function useBackToClose(active: boolean, onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const tokenRef = useRef<string | null>(null);
  const pendingCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    // A StrictMode remount (or an immediate re-activation) reuses the entry it already pushed.
    if (pendingCloseRef.current) {
      clearTimeout(pendingCloseRef.current);
      pendingCloseRef.current = null;
    }
    if (!tokenRef.current || currentToken() !== tokenRef.current) {
      tokenRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.history.pushState({ ...(window.history.state ?? {}), [TOKEN_KEY]: tokenRef.current }, "");
    }
    const token = tokenRef.current;

    const onPopState = () => {
      if (currentToken() === token) return;
      tokenRef.current = null;
      onBackRef.current();
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      if (tokenRef.current !== token) return;
      // Closed from the UI: drop our entry so the next Back leaves the page normally.
      pendingCloseRef.current = setTimeout(() => {
        pendingCloseRef.current = null;
        if (tokenRef.current !== token) return;
        tokenRef.current = null;
        if (currentToken() === token) window.history.back();
      }, 0);
    };
  }, [active]);
}
