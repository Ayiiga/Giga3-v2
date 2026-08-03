export type IntelligentNotificationCategory =
  | "social"
  | "messages"
  | "studio"
  | "learning"
  | "creator"
  | "system";

export type IntelligentNotification = {
  id: string;
  category: IntelligentNotificationCategory;
  title: string;
  body: string;
  href?: string;
  createdAt: number;
  readAt?: number | null;
  /** Prevents duplicate reminders within the dedupe window. */
  dedupeKey?: string;
  source: "local_engine" | "local_event";
};

export type IntelligentNotificationPreferences = {
  enabled: boolean;
  social: boolean;
  messages: boolean;
  studio: boolean;
  learning: boolean;
  creator: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  browserNotifications: boolean;
};

export type EngagementSignals = {
  lastAppOpenAt: number;
  lastContentCreateAt: number | null;
  lastSectionViews: Partial<Record<IntelligentNotificationCategory, number>>;
  /** Reminder keys → last fired at (cooldown). */
  reminderCooldowns: Partial<Record<string, number>>;
  completedActions: string[];
};

export const INTELLIGENT_NOTIFICATION_CATEGORIES: {
  id: IntelligentNotificationCategory;
  label: string;
  emoji: string;
}[] = [
  { id: "social", label: "Social", emoji: "❤️" },
  { id: "messages", label: "Chat", emoji: "💬" },
  { id: "studio", label: "Studio", emoji: "✨" },
  { id: "learning", label: "Learning", emoji: "📚" },
  { id: "creator", label: "Creator", emoji: "🏆" },
  { id: "system", label: "System", emoji: "🔔" },
];
