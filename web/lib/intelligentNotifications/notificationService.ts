/**
 * Modular NotificationService — local inbox, browser notifications, badge sync,
 * permission handling. Architecture ready for future push (no server push here).
 */

import {
  clearAppBadgeCount,
  postBadgeMessageToServiceWorker,
  setAppBadgeCount,
} from "@/lib/pwa/appBadge";
import { categoriesForPath } from "@/lib/intelligentNotifications/categoryPaths";
import {
  recordAppOpen,
  recordCompletedAction,
  recordContentCreate,
  recordSectionView,
} from "@/lib/intelligentNotifications/engagementSignals";
import {
  getIntelligentNotificationPrefs,
  isCategoryEnabled,
  isInQuietHours,
  loadIntelligentNotificationPreferences,
  saveIntelligentNotificationPreferences,
} from "@/lib/intelligentNotifications/preferences";
import { evaluateSmartReminders } from "@/lib/intelligentNotifications/reminderEngine";
import {
  addIntelligentNotification,
  clearIntelligentNotifications,
  countUnreadIntelligentNotifications,
  getIntelligentBadgeCounts,
  listIntelligentNotifications,
  markAllIntelligentNotificationsRead,
  markIntelligentCategoryViewed,
  markIntelligentNotificationRead,
} from "@/lib/intelligentNotifications/store";
import type {
  IntelligentNotification,
  IntelligentNotificationCategory,
  IntelligentNotificationPreferences,
} from "@/lib/intelligentNotifications/types";

export type BrowserPermissionState = NotificationPermission | "unsupported";

export const NotificationService = {
  /* —— Preferences —— */
  getPreferences(): IntelligentNotificationPreferences {
    return loadIntelligentNotificationPreferences();
  },

  setPreferences(prefs: IntelligentNotificationPreferences): void {
    saveIntelligentNotificationPreferences(prefs);
  },

  /* —— Local inbox —— */
  list(): IntelligentNotification[] {
    return listIntelligentNotifications();
  },

  unreadCount(category?: IntelligentNotificationCategory): number {
    return countUnreadIntelligentNotifications(category);
  },

  badgeCounts() {
    return getIntelligentBadgeCounts();
  },

  markRead(id: string): void {
    markIntelligentNotificationRead(id);
    void this.syncBadgeFromLocal();
  },

  markAllRead(category?: IntelligentNotificationCategory): void {
    markAllIntelligentNotificationsRead(category);
    void this.syncBadgeFromLocal();
  },

  clear(category?: IntelligentNotificationCategory): void {
    clearIntelligentNotifications(category);
    void this.syncBadgeFromLocal();
  },

  /**
   * Enqueue a local event notification when prefs / quiet hours allow.
   * Returns null when suppressed.
   */
  notifyLocal(input: {
    category: IntelligentNotificationCategory;
    title: string;
    body: string;
    href?: string;
    dedupeKey?: string;
    browserNotify?: boolean;
  }): IntelligentNotification | null {
    const prefs = getIntelligentNotificationPrefs();
    if (!isCategoryEnabled(prefs, input.category)) return null;
    if (isInQuietHours(prefs)) return null;

    const item = addIntelligentNotification({
      category: input.category,
      title: input.title,
      body: input.body,
      href: input.href,
      dedupeKey: input.dedupeKey,
      source: "local_event",
    });

    void this.syncBadgeFromLocal();

    if (input.browserNotify !== false && prefs.browserNotifications) {
      void this.showBrowserNotification(item.title, item.body, item.href);
    }

    return item;
  },

  /* —— Browser notifications (permission only; no push) —— */
  getBrowserPermission(): BrowserPermissionState {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  },

  async requestBrowserPermission(): Promise<BrowserPermissionState> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  },

  showBrowserNotification(title: string, body?: string, href?: string): boolean {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      return false;
    }
    try {
      const n = new Notification(title, {
        body,
        icon: "/icons/icon-192.png",
        tag: "giga3-intelligent",
        renotify: false,
      });
      if (href) {
        n.onclick = () => {
          window.focus();
          window.location.assign(href);
          n.close();
        };
      }
      return true;
    } catch {
      return false;
    }
  },

  /* —— Badging —— */
  async setBadgeCount(count: number): Promise<void> {
    const safe = Math.max(0, Math.min(99, Math.floor(count)));
    await setAppBadgeCount(safe);
    postBadgeMessageToServiceWorker("GIGA3_SET_BADGE", safe);
  },

  async clearBadge(): Promise<void> {
    await clearAppBadgeCount();
    postBadgeMessageToServiceWorker("GIGA3_CLEAR_BADGE");
  },

  /** Sync icon badge from local unread only (used when server totals unavailable). */
  async syncBadgeFromLocal(): Promise<void> {
    const prefs = getIntelligentNotificationPrefs();
    if (!prefs.enabled) {
      await this.clearBadge();
      return;
    }
    await this.setBadgeCount(countUnreadIntelligentNotifications());
  },

  /**
   * Combine server unread totals with local intelligent unread.
   * Callers pass existing Convex query results — no new APIs.
   */
  async syncCombinedBadge(serverUnread: number): Promise<void> {
    const prefs = getIntelligentNotificationPrefs();
    const local = prefs.enabled ? countUnreadIntelligentNotifications() : 0;
    const total = Math.max(0, Math.floor(serverUnread) + local);
    await this.setBadgeCount(total);
  },

  /** Mark local categories read when user opens a related section. */
  clearCategoriesForPath(pathname: string | null | undefined): IntelligentNotificationCategory[] {
    const cats = categoriesForPath(pathname);
    for (const cat of cats) {
      markIntelligentCategoryViewed(cat);
      recordSectionView(cat);
    }
    return cats;
  },

  /* —— Engagement / reminders —— */
  recordAppOpen(): void {
    recordAppOpen();
  },

  recordContentCreate(): void {
    recordContentCreate();
  },

  recordCompletedAction(action: string): void {
    recordCompletedAction(action);
  },

  evaluateReminders(options?: { allowDuringActiveSession?: boolean }) {
    return evaluateSmartReminders(options);
  },

  /**
   * Future push hook — intentionally a no-op stub so call sites can land early.
   * Server push must not be enabled from this frontend-only milestone.
   */
  async preparePushSupport(): Promise<{ ready: false; reason: string }> {
    return {
      ready: false,
      reason: "Server push is not enabled in Intelligent Notifications v1 (frontend-only).",
    };
  },
};
