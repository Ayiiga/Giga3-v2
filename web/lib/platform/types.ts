import type { UserRoleId } from "@/lib/vision";

export type NotificationCategory =
  | "ai_task"
  | "marketplace"
  | "wallet"
  | "learning"
  | "creator"
  | "system"
  | "security"
  | "social"
  | "announcement";

export type FeedbackType =
  | "general"
  | "bug"
  | "feature"
  | "ai_rating"
  | "incorrect_info"
  | "usability"
  | "content_report"
  | "unsafe_ai";

export type FeedbackStatus = "open" | "reviewing" | "resolved" | "closed";

export type FeedbackPriority = "low" | "normal" | "high" | "critical";

export type UserPreferences = {
  favoriteTools: string[];
  preferredWritingStyle: string;
  preferredLanguage: string;
  darkMode: "light" | "dark" | "system";
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  learningInterests: string[];
  marketplaceInterests: string[];
  privacyShareUsage: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};

export type OnboardingState = {
  completed: boolean;
  completedAt?: number;
  role: UserRoleId;
  stepsSeen: string[];
  dismissedTips: string[];
  /** Cross-product welcome modal (engagement.welcome) — once dismissed, do not re-show. */
  welcomeDismissedAt?: number;
  welcomeCompletedAt?: number;
  /** Selected engagement interests (stable ids from engagementControls). */
  interests?: string[];
  /** First-session checklist completion map. */
  checklistCompleted?: Record<string, number>;
  checklistDismissedAt?: number;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  favoriteTools: [],
  preferredWritingStyle: "balanced",
  preferredLanguage: "en",
  darkMode: "system",
  notificationsEnabled: true,
  emailNotifications: false,
  reducedMotion: false,
  largeText: false,
  learningInterests: [],
  marketplaceInterests: [],
  privacyShareUsage: true,
};

export const DEFAULT_ONBOARDING: OnboardingState = {
  completed: false,
  role: "general",
  stepsSeen: [],
  dismissedTips: [],
};
