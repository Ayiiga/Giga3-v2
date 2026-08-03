export { NotificationService } from "@/lib/intelligentNotifications/notificationService";
export {
  DEFAULT_INTELLIGENT_NOTIFICATION_PREFS,
  getIntelligentNotificationPrefs,
  isCategoryEnabled,
  isInQuietHours,
  loadIntelligentNotificationPreferences,
  saveIntelligentNotificationPreferences,
} from "@/lib/intelligentNotifications/preferences";
export {
  addIntelligentNotification,
  clearIntelligentNotifications,
  countUnreadIntelligentNotifications,
  getIntelligentBadgeCounts,
  listIntelligentNotifications,
  markAllIntelligentNotificationsRead,
  markIntelligentCategoryViewed,
  markIntelligentNotificationRead,
} from "@/lib/intelligentNotifications/store";
export { categoriesForPath } from "@/lib/intelligentNotifications/categoryPaths";
export { evaluateSmartReminders } from "@/lib/intelligentNotifications/reminderEngine";
export {
  INTELLIGENT_NOTIFICATION_CATEGORIES,
  type EngagementSignals,
  type IntelligentNotification,
  type IntelligentNotificationCategory,
  type IntelligentNotificationPreferences,
} from "@/lib/intelligentNotifications/types";
