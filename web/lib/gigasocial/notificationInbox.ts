/**
 * Pure helpers for the GigaSocial notifications inbox (activity feed — not DMs).
 */

import type { SocialNotification } from "@/lib/gigasocial/types";

export type NotificationEmptyReason = "loading" | "none" | "filtered" | "signed_out";

export function formatUnreadCountLabel(unreadCount: number): string {
  if (!Number.isFinite(unreadCount) || unreadCount <= 0) {
    return "You're all caught up.";
  }
  const n = Math.floor(unreadCount);
  return `${n} unread notification${n === 1 ? "" : "s"}`;
}

/** Badge text for nav chips — caps display at 9+. */
export function formatUnreadBadge(unreadCount: number): string {
  if (!Number.isFinite(unreadCount) || unreadCount <= 0) return "";
  return unreadCount > 9 ? "9+" : String(Math.floor(unreadCount));
}

export function resolveNotificationEmptyReason(args: {
  loading: boolean;
  signedIn: boolean;
  totalCount: number;
  visibleCount: number;
}): NotificationEmptyReason {
  if (args.loading) return "loading";
  if (!args.signedIn) return "signed_out";
  if (args.totalCount === 0) return "none";
  if (args.visibleCount === 0) return "filtered";
  return "none";
}

export function notificationEmptyCopy(reason: NotificationEmptyReason): {
  title: string;
  description: string;
} {
  switch (reason) {
    case "filtered":
      return {
        title: "Nothing in this filter",
        description:
          "Try All or enable more categories in Controls. Your other notifications are still saved.",
      };
    case "signed_out":
      return {
        title: "Sign in to view notifications",
        description: "Likes, comments, fans, and community activity appear here after you sign in.",
      };
    case "loading":
      return {
        title: "Loading notifications…",
        description: "Fetching your latest activity.",
      };
    default:
      return {
        title: "No notifications yet",
        description:
          "Likes, comments, fans, communities, and creator updates appear here. Direct messages are not available yet.",
      };
  }
}

/** Deep-link target for a notification row (relative app path). */
export function notificationHref(n: Pick<SocialNotification, "postId" | "communitySlug">): string | null {
  if (n.postId) return `/gigasocial/post/${n.postId}/`;
  if (n.communitySlug) {
    return `/gigasocial/?section=communities&community=${encodeURIComponent(n.communitySlug)}`;
  }
  return null;
}

/** Clamp list page size the same way the Convex query does. */
export function clampNotificationLimit(limit?: number): number {
  const raw = limit === undefined ? 30 : Number(limit);
  if (!Number.isFinite(raw)) return 30;
  return Math.min(Math.max(1, Math.floor(raw)), 60);
}
