import type { SocialNotification } from "@/lib/gigasocial/types";

export type NotificationCategoryId =
  | "creator"
  | "community"
  | "marketplace"
  | "wallet"
  | "learning"
  | "ai"
  | "messages"
  | "live"
  | "announcements"
  | "other";

export const NOTIFICATION_CATEGORIES: {
  id: NotificationCategoryId;
  label: string;
}[] = [
  { id: "creator", label: "Creator" },
  { id: "community", label: "Community" },
  { id: "marketplace", label: "Marketplace" },
  { id: "wallet", label: "Wallet" },
  { id: "learning", label: "Learning" },
  { id: "ai", label: "AI" },
  { id: "messages", label: "Messages" },
  { id: "live", label: "Live" },
  { id: "announcements", label: "Announcements" },
  { id: "other", label: "Other" },
];

const PREFS_KEY = "giga3_gigasocial_notification_prefs";

export type NotificationPrefs = Partial<Record<NotificationCategoryId, boolean>>;

export function categorizeNotification(n: SocialNotification): NotificationCategoryId {
  const type = (n.type || "").toLowerCase();
  const message = (n.message || "").toLowerCase();
  if (type.includes("community") || n.communitySlug) return "community";
  if (type.includes("follow") || type.includes("like") || type.includes("comment")) {
    return "creator";
  }
  if (type.includes("learning") || message.includes("learn")) return "learning";
  if (type.includes("creator") || message.includes("boost")) return "creator";
  if (type.includes("live") || message.includes("live")) return "live";
  if (message.includes("credit") || message.includes("gift") || message.includes("wallet")) {
    return "wallet";
  }
  if (message.includes("market") || message.includes("purchase")) return "marketplace";
  if (message.includes("ai") || message.includes("assistant")) return "ai";
  if (type.includes("mention") || type.includes("reply")) return "messages";
  if (message.includes("announce")) return "announcements";
  return "other";
}

export function groupNotifications(
  notifications: SocialNotification[]
): { category: NotificationCategoryId; label: string; items: SocialNotification[] }[] {
  const buckets = new Map<NotificationCategoryId, SocialNotification[]>();
  for (const n of notifications) {
    const cat = categorizeNotification(n);
    const list = buckets.get(cat) ?? [];
    list.push(n);
    buckets.set(cat, list);
  }
  return NOTIFICATION_CATEGORIES.map((cat) => ({
    category: cat.id,
    label: cat.label,
    items: buckets.get(cat.id) ?? [],
  })).filter((group) => group.items.length > 0);
}

export function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as NotificationPrefs;
  } catch {
    return {};
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function isCategoryEnabled(
  prefs: NotificationPrefs,
  category: NotificationCategoryId
): boolean {
  return prefs[category] !== false;
}

export function filterNotificationsByPrefs(
  notifications: SocialNotification[],
  prefs: NotificationPrefs
): SocialNotification[] {
  return notifications.filter((n) => isCategoryEnabled(prefs, categorizeNotification(n)));
}
