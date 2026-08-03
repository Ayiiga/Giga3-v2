import type {
  IntelligentNotificationCategory,
  IntelligentNotificationPreferences,
} from "@/lib/intelligentNotifications/types";

const PREFS_KEY = "giga3_intelligent_notification_prefs_v1";

export const DEFAULT_INTELLIGENT_NOTIFICATION_PREFS: IntelligentNotificationPreferences = {
  enabled: true,
  social: true,
  messages: true,
  studio: true,
  learning: true,
  creator: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  browserNotifications: false,
};

export function loadIntelligentNotificationPreferences(): IntelligentNotificationPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_INTELLIGENT_NOTIFICATION_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_INTELLIGENT_NOTIFICATION_PREFS };
    const parsed = JSON.parse(raw) as Partial<IntelligentNotificationPreferences>;
    return { ...DEFAULT_INTELLIGENT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_INTELLIGENT_NOTIFICATION_PREFS };
  }
}

/** Alias used by the NotificationService facade. */
export const getIntelligentNotificationPrefs = loadIntelligentNotificationPreferences;

export function saveIntelligentNotificationPreferences(
  prefs: IntelligentNotificationPreferences
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("giga3:intelligent-prefs-changed"));
  } catch {
    /* quota / private mode */
  }
}

function parseHm(value: string): number {
  const [h, m] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

/** True when current local time is inside quiet hours (supports overnight ranges). */
export function isInQuietHours(
  prefs: IntelligentNotificationPreferences,
  now = new Date()
): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = parseHm(prefs.quietHoursStart);
  const end = parseHm(prefs.quietHoursEnd);
  if (start === end) return true;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

export function isCategoryEnabled(
  prefs: IntelligentNotificationPreferences,
  category: IntelligentNotificationCategory
): boolean {
  if (!prefs.enabled) return false;
  if (category === "system") return true;
  return Boolean(prefs[category]);
}
