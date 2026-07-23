"use client";

import {
  clearAppBadgeCount,
  postBadgeMessageToServiceWorker,
  setAppBadgeCount,
} from "@/lib/pwa/appBadge";
import { getSessionToken } from "@/lib/auth";
import { getConvexClient } from "@/lib/convex";
import { getConvexUrl } from "@/lib/convex/env";
import { api } from "convex/_generated/api";
import { ConvexProvider, ConvexReactClient, useConvex } from "convex/react";
import { useEffect, useLayoutEffect, useState } from "react";

function AppBadgeSyncInner() {
  const convex = useConvex();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    async function syncFromServer() {
      const token = getSessionToken();
      if (!token) {
        await clearAppBadgeCount();
        postBadgeMessageToServiceWorker("GIGA3_CLEAR_BADGE");
        return;
      }
      try {
        const [social, platform] = await Promise.all([
          convex.query(api.gigaSocial.getNotificationUnreadCount, {
            sessionToken: token,
          }),
          convex.query(api.platformNotifications.listNotifications, {
            sessionToken: token,
            limit: 40,
          }),
        ]);
        if (cancelled) return;
        const socialUnread =
          typeof social?.unreadCount === "number" ? social.unreadCount : 0;
        const platformUnread =
          typeof platform?.unreadCount === "number" ? platform.unreadCount : 0;
        const total = Math.max(0, socialUnread + platformUnread);
        await setAppBadgeCount(total);
        postBadgeMessageToServiceWorker("GIGA3_SET_BADGE", total);
      } catch {
        /* offline — leave SW badge as-is */
      }
    }

    async function clearBadge() {
      await clearAppBadgeCount();
      postBadgeMessageToServiceWorker("GIGA3_CLEAR_BADGE");
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void clearBadge();
        return;
      }
      void syncFromServer();
    }

    function onFocus() {
      void clearBadge();
    }

    function onBlur() {
      void syncFromServer();
    }

    if (document.visibilityState === "visible") {
      void clearBadge();
    } else {
      void syncFromServer();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [convex]);

  return null;
}

/** Site-wide host — bumps/clears installed PWA icon badges for social + AI alerts. */
export function AppBadgeSync() {
  const [client, setClient] = useState<ConvexReactClient | null>(null);

  useLayoutEffect(() => {
    if (!getConvexUrl()) return;
    setClient(getConvexClient());
  }, []);

  if (!getConvexUrl() || !client) return null;

  return (
    <ConvexProvider client={client}>
      <AppBadgeSyncInner />
    </ConvexProvider>
  );
}
