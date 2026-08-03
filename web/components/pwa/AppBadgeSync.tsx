"use client";

import {
  clearAppBadgeCount,
  postBadgeMessageToServiceWorker,
  setAppBadgeCount,
} from "@/lib/pwa/appBadge";
import { shouldClearAppBadgeForPath } from "@/lib/pwa/badgeClearPaths";
import { getSessionToken } from "@/lib/auth";
import { getConvexClient } from "@/lib/convex";
import { getConvexUrl } from "@/lib/convex/env";
import { NotificationService } from "@/lib/intelligentNotifications";
import { api } from "convex/_generated/api";
import { ConvexProvider, ConvexReactClient, useConvex } from "convex/react";
import { useEffect, useLayoutEffect, useState } from "react";

function currentPathname(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname || "";
}

async function applyBadge(total: number) {
  const safe = Math.max(0, Math.min(99, Math.floor(total)));
  await setAppBadgeCount(safe);
  postBadgeMessageToServiceWorker("GIGA3_SET_BADGE", safe);
}

function AppBadgeSyncInner() {
  const convex = useConvex();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    async function syncFromServer() {
      const token = getSessionToken();
      const localUnread = NotificationService.getPreferences().enabled
        ? NotificationService.unreadCount()
        : 0;

      if (!token) {
        if (cancelled) return;
        await applyBadge(localUnread);
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
        const total = Math.max(0, socialUnread + platformUnread + localUnread);
        await applyBadge(total);
      } catch {
        if (cancelled) return;
        /* offline — keep local intelligent unread visible */
        await applyBadge(localUnread);
      }
    }

    async function clearBadge() {
      await clearAppBadgeCount();
      postBadgeMessageToServiceWorker("GIGA3_CLEAR_BADGE");
    }

    function clearIfRelevantSection() {
      const path = currentPathname();
      NotificationService.clearCategoriesForPath(path);

      if (shouldClearAppBadgeForPath(path)) {
        const remainingLocal = NotificationService.getPreferences().enabled
          ? NotificationService.unreadCount()
          : 0;
        if (remainingLocal <= 0) {
          void clearBadge();
        } else {
          void applyBadge(remainingLocal);
        }
        return true;
      }
      return false;
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        if (!clearIfRelevantSection()) {
          void syncFromServer();
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

    function onLocalChanged() {
      if (document.visibilityState === "visible" && clearIfRelevantSection()) {
        return;
      }
      void syncFromServer();
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
    window.addEventListener("giga3:route-change", onPathMaybeChanged);
    window.addEventListener("giga3:intelligent-notifications-changed", onLocalChanged);
    window.addEventListener("giga3:intelligent-prefs-changed", onLocalChanged);

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
      window.removeEventListener("giga3:intelligent-notifications-changed", onLocalChanged);
      window.removeEventListener("giga3:intelligent-prefs-changed", onLocalChanged);
      history.pushState = pushState;
      history.replaceState = replaceState;
    };
  }, [convex]);

  return null;
}

/** Site-wide host — bumps/clears installed PWA icon badges for social + AI + local alerts. */
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
