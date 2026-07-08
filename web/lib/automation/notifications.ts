import type {
  AutomationNotificationKey,
  AutomationNotificationPrefs,
} from "./types";

const STORAGE_KEY = "giga3_automation_notification_prefs";

export const NOTIFICATION_LABELS: Record<
  AutomationNotificationKey,
  { label: string; description: string }
> = {
  study_sessions: {
    label: "Study sessions",
    description: "Reminders for scheduled study and GigaLearn goals.",
  },
  assignment_deadlines: {
    label: "Assignment deadlines",
    description: "Alerts before workspace assignment due dates.",
  },
  creator_tasks: {
    label: "Creator tasks",
    description: "Creator Studio workflow and content reminders.",
  },
  marketplace_updates: {
    label: "Marketplace updates",
    description: "Sales, purchases, and listing activity.",
  },
  subscription_reminders: {
    label: "Subscription reminders",
    description: "Renewal and credit low-balance nudges.",
  },
  learning_goals: {
    label: "Learning goals",
    description: "Streak and progress milestones from GigaLearn.",
  },
};

const DEFAULT_PREFS: AutomationNotificationPrefs = {
  study_sessions: true,
  assignment_deadlines: true,
  creator_tasks: true,
  marketplace_updates: false,
  subscription_reminders: true,
  learning_goals: true,
};

export function getNotificationPrefs(): AutomationNotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as AutomationNotificationPrefs) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotificationPrefs(
  prefs: Partial<AutomationNotificationPrefs>
): AutomationNotificationPrefs {
  const next = { ...getNotificationPrefs(), ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function isNotificationEnabled(key: AutomationNotificationKey): boolean {
  return getNotificationPrefs()[key];
}
