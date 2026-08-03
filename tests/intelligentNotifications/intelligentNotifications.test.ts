import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { categoriesForPath } from "../../web/lib/intelligentNotifications/categoryPaths";
import {
  isCategoryEnabled,
  isInQuietHours,
  loadIntelligentNotificationPreferences,
  saveIntelligentNotificationPreferences,
  DEFAULT_INTELLIGENT_NOTIFICATION_PREFS,
} from "../../web/lib/intelligentNotifications/preferences";
import { evaluateSmartReminders } from "../../web/lib/intelligentNotifications/reminderEngine";
import {
  addIntelligentNotification,
  clearIntelligentNotifications,
  countUnreadIntelligentNotifications,
  getIntelligentBadgeCounts,
  listIntelligentNotifications,
  markIntelligentCategoryViewed,
} from "../../web/lib/intelligentNotifications/store";
import { NotificationService } from "../../web/lib/intelligentNotifications/notificationService";

function mockStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    localStorage: storage,
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal("document", {
    visibilityState: "hidden",
    hasFocus: () => false,
  });
}

describe("intelligent notification preferences", () => {
  beforeEach(() => {
    mockStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads defaults and persists toggles", () => {
    expect(loadIntelligentNotificationPreferences()).toEqual(
      DEFAULT_INTELLIGENT_NOTIFICATION_PREFS
    );
    saveIntelligentNotificationPreferences({
      ...DEFAULT_INTELLIGENT_NOTIFICATION_PREFS,
      social: false,
      quietHoursEnabled: true,
    });
    const prefs = loadIntelligentNotificationPreferences();
    expect(prefs.social).toBe(false);
    expect(prefs.quietHoursEnabled).toBe(true);
  });

  it("respects quiet hours overnight", () => {
    const prefs = {
      ...DEFAULT_INTELLIGENT_NOTIFICATION_PREFS,
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    };
    expect(isInQuietHours(prefs, new Date("2026-08-03T23:30:00"))).toBe(true);
    expect(isInQuietHours(prefs, new Date("2026-08-03T12:00:00"))).toBe(false);
  });

  it("disables categories when master switch is off", () => {
    const prefs = { ...DEFAULT_INTELLIGENT_NOTIFICATION_PREFS, enabled: false };
    expect(isCategoryEnabled(prefs, "studio")).toBe(false);
  });
});

describe("intelligent notification store + badges", () => {
  beforeEach(() => {
    mockStorage();
    clearIntelligentNotifications();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks unread counts by category", () => {
    addIntelligentNotification({
      category: "social",
      title: "Someone reacted to your post",
      body: "❤️ ×3",
      source: "local_event",
    });
    addIntelligentNotification({
      category: "messages",
      title: "New chat activity",
      body: "2 unread",
      source: "local_event",
    });
    addIntelligentNotification({
      category: "studio",
      title: "Your AI creation is ready",
      body: "Open Studio",
      source: "local_event",
    });

    const counts = getIntelligentBadgeCounts();
    expect(counts.social).toBe(1);
    expect(counts.messages).toBe(1);
    expect(counts.studio).toBe(1);
    expect(countUnreadIntelligentNotifications()).toBe(3);

    markIntelligentCategoryViewed("social");
    expect(countUnreadIntelligentNotifications("social")).toBe(0);
    expect(countUnreadIntelligentNotifications()).toBe(2);
  });
});

describe("category path clearing", () => {
  it("maps sections to badge categories", () => {
    expect(categoriesForPath("/gigasocial")).toEqual(
      expect.arrayContaining(["social", "creator"])
    );
    expect(categoriesForPath("/chat")).toContain("messages");
    expect(categoriesForPath("/media")).toContain("studio");
    expect(categoriesForPath("/gigalearn")).toContain("learning");
    expect(categoriesForPath("/chat/login")).toEqual([]);
  });
});

describe("reminder engine", () => {
  beforeEach(() => {
    mockStorage();
    clearIntelligentNotifications();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates at most one reminder when allowed and respects disable", () => {
    const created = evaluateSmartReminders({ allowDuringActiveSession: true });
    expect(created).not.toBeNull();
    expect(listIntelligentNotifications().length).toBe(1);

    const second = evaluateSmartReminders({ allowDuringActiveSession: true });
    expect(second).toBeNull();

    saveIntelligentNotificationPreferences({
      ...DEFAULT_INTELLIGENT_NOTIFICATION_PREFS,
      enabled: false,
    });
    clearIntelligentNotifications();
    expect(evaluateSmartReminders({ allowDuringActiveSession: true })).toBeNull();
  });

  it("NotificationService.preparePushSupport stays frontend-only", async () => {
    const result = await NotificationService.preparePushSupport();
    expect(result.ready).toBe(false);
  });
});
