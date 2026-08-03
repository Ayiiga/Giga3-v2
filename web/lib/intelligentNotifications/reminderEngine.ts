/**
 * Local smart reminder engine — cooldowns, quiet hours, no spam during active sessions.
 * Frontend-only.
 */

import {
  getEngagementSignals,
  isReminderOnCooldown,
  recordReminderCooldown,
} from "@/lib/intelligentNotifications/engagementSignals";
import {
  getIntelligentNotificationPrefs,
  isCategoryEnabled,
  isInQuietHours,
} from "@/lib/intelligentNotifications/preferences";
import { addLocalNotification } from "@/lib/intelligentNotifications/store";
import type {
  IntelligentNotification,
  IntelligentNotificationCategory,
} from "@/lib/intelligentNotifications/types";

const SESSION_ACTIVE_MS = 2 * 60 * 1000;
const GLOBAL_REMINDER_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const CREATE_IDLE_MS = 24 * 60 * 60 * 1000;

type ReminderCandidate = {
  category: IntelligentNotificationCategory;
  title: string;
  body: string;
  href?: string;
  dedupeKey: string;
};

function isDocumentActiveSession(): boolean {
  if (typeof document === "undefined") return false;
  if (document.visibilityState !== "visible") return false;
  const signals = getEngagementSignals();
  if (signals.lastAppOpenAt > 0 && Date.now() - signals.lastAppOpenAt < SESSION_ACTIVE_MS) {
    return true;
  }
  return document.hasFocus();
}

function buildCandidates(): ReminderCandidate[] {
  const signals = getEngagementSignals();
  const now = Date.now();
  const out: ReminderCandidate[] = [];

  const idleCreate =
    signals.lastContentCreateAt == null ||
    now - signals.lastContentCreateAt >= CREATE_IDLE_MS;
  if (idleCreate) {
    out.push({
      category: "studio",
      title: "Try creating something new today",
      body: "Open AI Studio and turn an idea into an image or short video.",
      href: "/media",
      dedupeKey: "reminder:create-today",
    });
  }

  const lastLearning = signals.lastSectionViews.learning ?? 0;
  if (!lastLearning || now - lastLearning > CREATE_IDLE_MS) {
    out.push({
      category: "learning",
      title: "Learning reminder",
      body: "A short practice session keeps your skills sharp — open GigaLearn when ready.",
      href: "/gigalearn",
      dedupeKey: "reminder:learning",
    });
  }

  if (signals.completedActions.includes("studio:generation-ready")) {
    out.push({
      category: "studio",
      title: "Your AI creation is ready",
      body: "Review your latest generation in AI Studio.",
      href: "/media",
      dedupeKey: "reminder:studio-ready",
    });
  }

  if (signals.completedActions.includes("social:milestone")) {
    out.push({
      category: "creator",
      title: "Your post reached a milestone",
      body: "Check GigaSocial to see how your community responded.",
      href: "/gigasocial",
      dedupeKey: "reminder:creator-milestone",
    });
  }

  return out;
}

/**
 * Evaluate and optionally enqueue at most one smart reminder.
 * Returns the notification if one was created.
 */
export function evaluateSmartReminders(options?: {
  /** Force evaluation even during an active focused session (for tests). */
  allowDuringActiveSession?: boolean;
}): IntelligentNotification | null {
  const prefs = getIntelligentNotificationPrefs();
  if (!prefs.enabled) return null;
  if (isInQuietHours(prefs)) return null;

  if (isReminderOnCooldown("global", GLOBAL_REMINDER_COOLDOWN_MS)) {
    return null;
  }

  if (!options?.allowDuringActiveSession && isDocumentActiveSession()) {
    return null;
  }

  const candidates = buildCandidates().filter(
    (c) =>
      isCategoryEnabled(prefs, c.category) &&
      !isReminderOnCooldown(c.dedupeKey, GLOBAL_REMINDER_COOLDOWN_MS)
  );
  if (candidates.length === 0) return null;

  const priority: IntelligentNotificationCategory[] = [
    "studio",
    "creator",
    "social",
    "learning",
    "messages",
  ];
  candidates.sort(
    (a, b) => priority.indexOf(a.category) - priority.indexOf(b.category)
  );
  const pick = candidates[0];
  if (!pick) return null;

  const created = addLocalNotification({
    category: pick.category,
    title: pick.title,
    body: pick.body,
    href: pick.href,
    dedupeKey: pick.dedupeKey,
    source: "local_engine",
  });
  if (created) {
    recordReminderCooldown("global");
    recordReminderCooldown(pick.dedupeKey);
  }
  return created;
}
