"use client";

import { NotificationService } from "@/lib/intelligentNotifications";
import type {
  IntelligentNotification,
  IntelligentNotificationCategory,
  IntelligentNotificationPreferences,
} from "@/lib/intelligentNotifications/types";
import { useCallback, useEffect, useState } from "react";

function readList(): IntelligentNotification[] {
  return NotificationService.list();
}

function readPrefs(): IntelligentNotificationPreferences {
  return NotificationService.getPreferences();
}

/** Reactive local intelligent notifications inbox + preferences. */
export function useIntelligentNotifications() {
  const [items, setItems] = useState<IntelligentNotification[]>([]);
  const [prefs, setPrefs] = useState<IntelligentNotificationPreferences>(readPrefs);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setItems(readList());
    setPrefs(readPrefs());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);
    function onChange() {
      refresh();
    }
    window.addEventListener("giga3:intelligent-notifications-changed", onChange);
    window.addEventListener("giga3:intelligent-prefs-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("giga3:intelligent-notifications-changed", onChange);
      window.removeEventListener("giga3:intelligent-prefs-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  const unreadCount = items.filter((n) => !n.readAt).length;
  const badgeCounts = NotificationService.badgeCounts();

  const markRead = useCallback((id: string) => {
    NotificationService.markRead(id);
  }, []);

  const markAllRead = useCallback((category?: IntelligentNotificationCategory) => {
    NotificationService.markAllRead(category);
  }, []);

  const clear = useCallback((category?: IntelligentNotificationCategory) => {
    NotificationService.clear(category);
  }, []);

  const updatePrefs = useCallback((next: IntelligentNotificationPreferences) => {
    NotificationService.setPreferences(next);
  }, []);

  return {
    items,
    prefs,
    hydrated,
    unreadCount,
    badgeCounts,
    markRead,
    markAllRead,
    clear,
    updatePrefs,
    refresh,
  };
}
