"use client";

import { getSessionToken } from "@/lib/auth";
import type { NotificationCategory } from "@/lib/platform/types";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Bell, CheckCheck, X } from "lucide-react";
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

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [filter, setFilter] = useState<NotificationCategory | "all">("all");
  const sessionToken = getSessionToken();
  const data = useQuery(
    api.platformNotifications.listNotifications,
    sessionToken ? { sessionToken, limit: 50, category: filter === "all" ? undefined : filter } : "skip"
  );
  const markRead = useMutation(api.platformNotifications.markNotificationRead);
  const markAllRead = useMutation(api.platformNotifications.markAllNotificationsRead);

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = useMemo(() => data?.notifications ?? [], [data]);

  if (!open) return null;

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
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" aria-hidden />
            <h2 className="font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-white">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {sessionToken && unreadCount > 0 && (
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-muted/50"
                aria-label="Mark all read"
                onClick={() => void markAllRead({ sessionToken })}
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-muted/50" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                filter === c.id ? "bg-accent text-white" : "bg-muted/30 text-muted hover:text-foreground"
              }`}
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!sessionToken && (
            <p className="py-8 text-center text-sm text-muted">
              <Link href="/chat/login" className="text-accent hover:underline">Sign in</Link> to see notifications
            </p>
          )}

          {sessionToken && notifications.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No notifications yet</p>
          )}

          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n._id}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  n.read ? "border-border opacity-70" : "border-accent/20 bg-accent/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                    {n.href && (
                      <Link href={n.href} className="mt-1 inline-block text-xs text-accent hover:underline" onClick={onClose}>
                        View
                      </Link>
                    )}
                  </div>
                  {!n.read && sessionToken && (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-accent hover:underline"
                      onClick={() =>
                        void markRead({
                          sessionToken,
                          notificationId: n._id as Id<"platformNotifications">,
                        })
                      }
                    >
                      Read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell({ onClick, unreadCount }: { onClick: () => void; unreadCount: number }) {
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
