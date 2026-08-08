"use client";

import {
  clearAppBadgeCount,
  postBadgeMessageToServiceWorker,
  setAppBadgeCount,
} from "@/lib/pwa/appBadge";
import {
  attentionBadgeFloor,
  recordAppOpen,
  shouldShowAttentionDot,
} from "@/lib/pwa/attentionDot";
import { shouldClearAppBadgeForPath } from "@/lib/pwa/badgeClearPaths";
import { getSessionToken } from "@/lib/auth";
import { getConvexClient } from "@/lib/convex";
import { getConvexUrl } from "@/lib/convex/env";
import { api } from "convex/_generated/api";
import { ConvexProvider, ConvexReactClient, useConvex } from "convex/react";
import { useEffect, useLayoutEffect, useState } from "react";

function currentPathname(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname || "";
}

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
        const unread = Math.max(0, socialUnread + platformUnread);
        // Soft 24h attention: at most +1 when away; never inflates real unread.
        const total = attentionBadgeFloor(unread);
        await setAppBadgeCount(total);
        postBadgeMessageToServiceWorker("GIGA3_SET_BADGE", total);
      } catch {
        /* offline — if away ~24h, still surface a gentle attention badge */
        if (shouldShowAttentionDot()) {
          await setAppBadgeCount(1);
          postBadgeMessageToServiceWorker("GIGA3_SET_BADGE", 1);
        }
      }
    }

    async function clearBadge() {
      recordAppOpen();
      await clearAppBadgeCount();
      postBadgeMessageToServiceWorker("GIGA3_CLEAR_BADGE");
    }

    function clearIfRelevantSection() {
      if (shouldClearAppBadgeForPath(currentPathname())) {
        void clearBadge();
        return true;
      }
      return false;
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        const due = shouldShowAttentionDot();
        recordAppOpen();
        if (!clearIfRelevantSection()) {
          void syncFromServer();
        } else if (due) {
          // Cleared on open after 24h away — attention reset.
        }
        return;
      }
      void syncFromServer();
    }

    function onFocus() {
      clearIfRelevantSection();
    }

    function onBlur() {
      void syncFromServer();
    }

    function onPathMaybeChanged() {
      clearIfRelevantSection();
    }

    if (document.visibilityState === "visible") {
      if (!clearIfRelevantSection()) {
        void syncFromServer();
      }
    } else {
      void syncFromServer();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("popstate", onPathMaybeChanged);
    // App-router soft navigations
    window.addEventListener("giga3:route-change", onPathMaybeChanged);

    const pushState = history.pushState.bind(history);
    const replaceState = history.replaceState.bind(history);
    history.pushState = function (...args) {
      const result = pushState(...args);
      onPathMaybeChanged();
      return result;
    };
    history.replaceState = function (...args) {
      const result = replaceState(...args);
      onPathMaybeChanged();
      return result;
    };

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("popstate", onPathMaybeChanged);
      window.removeEventListener("giga3:route-change", onPathMaybeChanged);
      history.pushState = pushState;
      history.replaceState = replaceState;
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
