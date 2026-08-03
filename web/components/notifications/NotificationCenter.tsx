"use client";

import { IntelligentNotificationPreferencesPanel } from "@/components/notifications/IntelligentNotificationPreferencesPanel";
import { useIntelligentNotifications } from "@/hooks/useIntelligentNotifications";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getSessionToken } from "@/lib/auth";
import { INTELLIGENT_NOTIFICATION_CATEGORIES } from "@/lib/intelligentNotifications";
import type { NotificationCategory } from "@/lib/platform/types";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Bell, CheckCheck, Settings2, Trash2, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const CATEGORIES: { id: NotificationCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ai_task", label: "AI" },
  { id: "marketplace", label: "Marketplace" },
  { id: "wallet", label: "Wallet" },
  { id: "learning", label: "Learning" },
  { id: "social", label: "Social" },
  { id: "system", label: "System" },
];

type NotificationCenterProps = {
  open: boolean;
  onClose: () => void;
};

type UnifiedRow =
  | {
      kind: "local";
      id: string;
      localId: string;
      title: string;
      body: string;
      href?: string;
      createdAt: number;
      read: boolean;
      categoryLabel: string;
    }
  | {
      kind: "platform";
      id: string;
      title: string;
      body: string;
      href?: string;
      createdAt: number;
      read: boolean;
      categoryLabel: string;
      platformId: Id<"platformNotifications">;
    };

function categoryEmoji(category: string): string {
  return (
    INTELLIGENT_NOTIFICATION_CATEGORIES.find((c) => c.id === category)?.emoji ?? "🔔"
  );
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [filter, setFilter] = useState<NotificationCategory | "all">("all");
  const [showPrefs, setShowPrefs] = useState(false);
  const online = useOnlineStatus();
  const sessionToken = getSessionToken();
  const {
    items: localItems,
    unreadCount: localUnread,
    hydrated,
    markRead: markLocalRead,
    markAllRead: markAllLocalRead,
    clear: clearLocal,
    badgeCounts,
  } = useIntelligentNotifications();

  const data = useQuery(
    api.platformNotifications.listNotifications,
    sessionToken
      ? { sessionToken, limit: 50, category: filter === "all" ? undefined : filter }
      : "skip"
  );
  const markRead = useMutation(api.platformNotifications.markNotificationRead);
  const markAllRead = useMutation(api.platformNotifications.markAllNotificationsRead);

  const platformUnread = data?.unreadCount ?? 0;
  const unreadCount = platformUnread + localUnread;
  const platformLoading = Boolean(sessionToken) && data === undefined && online;

  const unified = useMemo(() => {
    const rows: UnifiedRow[] = [];

    for (const n of localItems) {
      if (filter !== "all") {
        const map: Partial<Record<NotificationCategory, string[]>> = {
          social: ["social", "creator"],
          learning: ["learning"],
          ai_task: ["studio"],
          system: ["system", "messages"],
        };
        const allowed = map[filter];
        if (allowed && !allowed.includes(n.category)) continue;
      }
      rows.push({
        kind: "local",
        id: `local:${n.id}`,
        localId: n.id,
        title: `${categoryEmoji(n.category)} ${n.title}`,
        body: n.body,
        href: n.href,
        createdAt: n.createdAt,
        read: Boolean(n.readAt),
        categoryLabel: n.category,
      });
    }

    for (const n of data?.notifications ?? []) {
      rows.push({
        kind: "platform",
        id: `platform:${n._id}`,
        title: n.title,
        body: n.body,
        href: n.href,
        createdAt: n.createdAt,
        read: n.read,
        categoryLabel: n.category,
        platformId: n._id as Id<"platformNotifications">,
      });
    }

    return rows.sort((a, b) => b.createdAt - a.createdAt);
  }, [data?.notifications, filter, localItems]);

  if (!open) return null;

  const badgeSummary = [
    badgeCounts.social > 0 ? `Social ❤️ ${badgeCounts.social}` : null,
    badgeCounts.messages > 0 ? `Chat 💬 ${badgeCounts.messages}` : null,
    badgeCounts.studio > 0 ? `Studio ✨ ${badgeCounts.studio}` : null,
    badgeCounts.learning > 0 ? `Learning 📚 ${badgeCounts.learning}` : null,
    badgeCounts.creator > 0 ? `Creator 🏆 ${badgeCounts.creator}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 shrink-0" aria-hidden />
              <h2 className="font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {badgeSummary ? (
              <p className="truncate text-[11px] text-muted">{badgeSummary}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg p-2 text-muted hover:bg-muted/50"
              aria-label="Notification settings"
              aria-pressed={showPrefs}
              onClick={() => setShowPrefs((v) => !v)}
            >
              <Settings2 className="h-4 w-4" />
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-muted/50"
                aria-label="Mark all read"
                onClick={() => {
                  markAllLocalRead();
                  if (sessionToken) void markAllRead({ sessionToken });
                }}
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            {localItems.length > 0 && (
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-muted/50"
                aria-label="Clear local notifications"
                onClick={() => clearLocal()}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted hover:bg-muted/50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!online ? (
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2 text-xs text-muted">
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Offline — showing local notifications saved on this device.
          </div>
        ) : null}

        {showPrefs ? (
          <div className="flex-1 overflow-y-auto p-3">
            <IntelligentNotificationPreferencesPanel embedded />
          </div>
        ) : (
          <>
            <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                    filter === c.id
                      ? "bg-accent text-white"
                      : "bg-muted/30 text-muted hover:text-foreground"
                  }`}
                  onClick={() => setFilter(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {!hydrated || platformLoading ? (
                <p className="py-8 text-center text-sm text-muted" aria-live="polite">
                  Loading notifications…
                </p>
              ) : null}

              {hydrated && !platformLoading && unified.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="mx-auto h-8 w-8 text-muted/50" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-foreground">You&apos;re all caught up</p>
                  <p className="mt-1 text-xs text-muted">
                    Social, Studio, and learning reminders will appear here.
                  </p>
                  {!sessionToken ? (
                    <p className="mt-3 text-xs text-muted">
                      <Link href="/chat/login" className="text-accent hover:underline">
                        Sign in
                      </Link>{" "}
                      for account notifications across devices.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <ul className="space-y-2">
                {unified.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      n.read ? "border-border opacity-70" : "border-accent/20 bg-accent/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{n.title}</p>
                        <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted/80">
                          {n.kind === "local" ? "On this device" : "Account"} · {n.categoryLabel}
                        </p>
                        {n.href && (
                          <Link
                            href={n.href}
                            className="mt-1 inline-block text-xs text-accent hover:underline"
                            onClick={onClose}
                          >
                            View
                          </Link>
                        )}
                      </div>
                      {!n.read && (
                        <button
                          type="button"
                          className="shrink-0 text-xs text-accent hover:underline"
                          onClick={() => {
                            if (n.kind === "local") {
                              markLocalRead(n.localId);
                              return;
                            }
                            if (sessionToken) {
                              void markRead({
                                sessionToken,
                                notificationId: n.platformId,
                              });
                            }
                          }}
                        >
                          Read
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function NotificationBell({
  onClick,
  unreadCount,
}: {
  onClick: () => void;
  unreadCount: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-accent/10 hover:text-foreground"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
    >
      <Bell className="h-4 w-4" aria-hidden />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
