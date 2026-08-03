/**
 * Lightweight local engagement signals for the reminder engine.
 * Frontend-only — localStorage. No backend.
 */

import type {
  EngagementSignals,
  IntelligentNotificationCategory,
} from "@/lib/intelligentNotifications/types";

const STORAGE_KEY = "giga3_intelligent_engagement_v1";

const DEFAULT_SIGNALS: EngagementSignals = {
  lastAppOpenAt: 0,
  lastContentCreateAt: null,
  lastSectionViews: {},
  reminderCooldowns: {},
  completedActions: [],
};

function read(): EngagementSignals {
  if (typeof window === "undefined") return { ...DEFAULT_SIGNALS, lastSectionViews: {}, reminderCooldowns: {}, completedActions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_SIGNALS,
        lastSectionViews: {},
        reminderCooldowns: {},
        completedActions: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<EngagementSignals>;
    return {
      lastAppOpenAt: typeof parsed.lastAppOpenAt === "number" ? parsed.lastAppOpenAt : 0,
      lastContentCreateAt:
        typeof parsed.lastContentCreateAt === "number" ? parsed.lastContentCreateAt : null,
      lastSectionViews:
        parsed.lastSectionViews && typeof parsed.lastSectionViews === "object"
          ? parsed.lastSectionViews
          : {},
      reminderCooldowns:
        parsed.reminderCooldowns && typeof parsed.reminderCooldowns === "object"
          ? parsed.reminderCooldowns
          : {},
      completedActions: Array.isArray(parsed.completedActions)
        ? parsed.completedActions.filter((s): s is string => typeof s === "string").slice(0, 24)
        : [],
    };
  } catch {
    return {
      ...DEFAULT_SIGNALS,
      lastSectionViews: {},
      reminderCooldowns: {},
      completedActions: [],
    };
  }
}

function write(signals: EngagementSignals): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
  } catch {
    /* quota */
  }
}

export function getEngagementSignals(): EngagementSignals {
  return read();
}

export function recordAppOpen(): void {
  const next = read();
  next.lastAppOpenAt = Date.now();
  write(next);
}

export function recordContentCreate(): void {
  const next = read();
  next.lastContentCreateAt = Date.now();
  write(next);
}

export function recordReminderCooldown(key: string): void {
  const next = read();
  next.reminderCooldowns = { ...next.reminderCooldowns, [key]: Date.now() };
  write(next);
}

export function recordSectionView(section: IntelligentNotificationCategory): void {
  const next = read();
  next.lastSectionViews = { ...next.lastSectionViews, [section]: Date.now() };
  write(next);
}

export function recordCompletedAction(action: string): void {
  const next = read();
  next.completedActions = [
    action,
    ...next.completedActions.filter((a) => a !== action),
  ].slice(0, 24);
  write(next);
}

export function isReminderOnCooldown(key: string, cooldownMs: number): boolean {
  const at = read().reminderCooldowns[key];
  if (!at) return false;
  return Date.now() - at < cooldownMs;
}
