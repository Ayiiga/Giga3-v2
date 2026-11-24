import type { SocialNotification } from "@/lib/gigasocial/types";
import { fanNotificationMessage } from "./fanBranding";

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

/** Normalize historical full-sentence messages without repeating actor names. */
export function notificationDisplayMessage(n: SocialNotification): string {
  const actor = n.actor?.displayName?.trim();
  const message = fanNotificationMessage(n.type, n.message || "").trim();
  if (!actor) return message || "You have a new activity update.";
  if (n.type === "follow") return `${actor} became your fan.`;
  // Older creator events embedded the actor's display name or former handle.
  if (n.type === "creator" && /(?:^|\s)published a new post[.!]?$/i.test(message)) {
    return `${actor} published a new post.`;
  }
  if (message.toLowerCase() === actor.toLowerCase() || message.toLowerCase().startsWith(actor.toLowerCase() + " ")) return message;
  const handle = n.actor?.handle?.replace(/^@/, "").trim();
  if (handle) {
    for (const prefix of [handle, "@" + handle]) {
      if (message.toLowerCase().startsWith(prefix.toLowerCase() + " ")) {
        return `${actor} ${message.slice(prefix.length).trimStart()}`;
      }
    }
  }
  return message ? `${actor} ${message}` : `${actor} shared an activity update.`;
}

export function notificationDestination(n: SocialNotification): { href: string; label: string } | null {
  if (n.postId) return { href: `/gigasocial/post/${encodeURIComponent(n.postId)}/`, label: "View post" };
  if (n.communitySlug) return { href: `/gigasocial/?community=${encodeURIComponent(n.communitySlug)}`, label: "Open community" };
  const handle = n.actor?.handle?.replace(/^@/, "").trim().toLowerCase();
  if (handle && ["follow", "creator", "like", "comment", "reply", "mention"].includes(n.type)) {
    return { href: `/gigasocial/profile/${encodeURIComponent(handle)}/`, label: "View profile" };
  }
  return null;
}
