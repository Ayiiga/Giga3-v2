"use client";

import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/datetime";
import type { SocialNotification } from "@/lib/gigasocial/types";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Bell, Loader2 } from "lucide-react";
import { memo } from "react";

export const GigaSocialNotificationsPanel = memo(function GigaSocialNotificationsPanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const data = useQuery(api.gigaSocial.listNotifications, { sessionToken, limit: 40 });
  const markRead = useMutation(api.gigaSocial.markNotificationsRead);

  if (data === undefined) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted" aria-hidden />
      </div>
    );
  }

  const notifications = (data.notifications ?? []) as SocialNotification[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {data.unreadCount > 0
            ? `${data.unreadCount} unread notification${data.unreadCount === 1 ? "" : "s"}`
            : "You're all caught up."}
        </p>
        {data.unreadCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void markRead({ sessionToken })}
            className="min-h-9"
          >
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="saas-card flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
          <Bell className="mb-2 h-8 w-8 text-muted" aria-hidden />
          <p className="text-sm text-muted">Notifications about likes, comments, and communities appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={`saas-card rounded-xl border px-4 py-3 text-sm ${
                n.read ? "border-border opacity-80" : "border-accent/30 bg-accent/5"
              }`}
            >
              <p className="text-foreground">
                {n.actor ? (
                  <span className="font-medium">{n.actor.displayName}</span>
                ) : (
                  <span className="font-medium">GigaSocial</span>
                )}{" "}
                <span className="text-muted">{n.message}</span>
              </p>
              <p className="mt-1 text-xs text-muted">{formatRelativeTime(n.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
