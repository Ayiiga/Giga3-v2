"use client";

import { NotificationsSkeleton } from "@/components/gigasocial/ux/PanelSkeletons";
import { SocialEmptyState } from "@/components/gigasocial/ux/SocialEmptyState";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/datetime";
import { fanNotificationMessage } from "@/lib/gigasocial/fanBranding";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import {
  filterNotificationsByPrefs,
  groupNotifications,
  loadNotificationPrefs,
  NOTIFICATION_CATEGORIES,
  saveNotificationPrefs,
  type NotificationCategoryId,
  type NotificationPrefs,
} from "@/lib/gigasocial/notificationGroups";
import {
  formatUnreadCountLabel,
  notificationEmptyCopy,
  notificationHref,
  resolveNotificationEmptyReason,
} from "@/lib/gigasocial/notificationInbox";
import type { SocialNotification } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Bell, Settings2 } from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";

export const GigaSocialNotificationsPanel = memo(function GigaSocialNotificationsPanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const features = useGigaSocialFeatures();
  const data = useQuery(api.gigaSocial.listNotifications, { sessionToken, limit: 40 });
  const markRead = useMutation(api.gigaSocial.markNotificationsRead);
  const [prefs, setPrefs] = useState<NotificationPrefs>({});
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategoryId | "all">("all");
  const [marking, setMarking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(loadNotificationPrefs());
  }, []);

  const notifications = useMemo(
    () => (data?.notifications ?? []) as SocialNotification[],
    [data?.notifications]
  );

  const filtered = useMemo(() => {
    const byPrefs = features.enableSmartNotifications
      ? filterNotificationsByPrefs(notifications, prefs)
      : notifications;
    if (!features.enableSmartNotifications || activeCategory === "all") return byPrefs;
    return groupNotifications(byPrefs).find((g) => g.category === activeCategory)?.items ?? [];
  }, [activeCategory, features.enableSmartNotifications, notifications, prefs]);

  const groups = useMemo(
    () => (features.enableSmartNotifications ? groupNotifications(filtered) : []),
    [features.enableSmartNotifications, filtered]
  );

  const emptyReason = resolveNotificationEmptyReason({
    loading: data === undefined,
    signedIn: Boolean(sessionToken),
    totalCount: notifications.length,
    visibleCount: filtered.length,
  });
  const emptyCopy = notificationEmptyCopy(emptyReason);

  if (data === undefined) {
    return <NotificationsSkeleton />;
  }

  async function handleMarkAllRead() {
    setActionError(null);
    setMarking(true);
    try {
      const result = await markRead({ sessionToken });
      if (result && "ok" in result && result.ok === false) {
        setActionError("Could not mark notifications as read. Try again.");
      }
    } catch {
      setActionError("Could not mark notifications as read. Try again.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Activity inbox — likes, comments, fans, and community updates. Direct messages are not available yet.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {formatUnreadCountLabel(data.unreadCount)}
        </p>
        <div className="flex flex-wrap gap-2">
          {features.enableSmartNotifications ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setPrefsOpen((value) => !value)}
              className="min-h-11"
              aria-expanded={prefsOpen}
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              <span className="ml-1">Controls</span>
            </Button>
          ) : null}
          {data.unreadCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleMarkAllRead()}
              disabled={marking}
              className="min-h-11"
            >
              {marking ? "Marking…" : "Mark all read"}
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {actionError}
        </p>
      ) : null}

      {features.enableSmartNotifications && prefsOpen ? (
        <div className="saas-card rounded-2xl border border-border p-3">
          <p className="text-xs font-semibold text-foreground">Notification categories</p>
          <p className="mt-0.5 text-[11px] text-muted">
            Granular controls are stored on this device. Disabled categories stay hidden.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {NOTIFICATION_CATEGORIES.map((category) => {
              const enabled = prefs[category.id] !== false;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    const next = { ...prefs, [category.id]: !enabled };
                    setPrefs(next);
                    saveNotificationPrefs(next);
                  }}
                  className={cn(
                    "gigasocial-pressable min-h-10 rounded-full border px-2.5 text-[11px] font-medium",
                    enabled
                      ? "border-accent/40 bg-accent/10 text-foreground"
                      : "border-border bg-white text-muted line-through"
                  )}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {features.enableSmartNotifications ? (
        <div
          className="sticky top-0 z-[1] -mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain bg-[var(--background,white)]/95 px-1 py-1 pb-1.5 backdrop-blur-sm"
          role="tablist"
          aria-label="Notification filters"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            className={cn(
              "gigasocial-pressable min-h-10 shrink-0 rounded-full border px-3 text-[11px] font-medium",
              activeCategory === "all"
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border bg-white text-muted"
            )}
          >
            All
          </button>
          {NOTIFICATION_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "gigasocial-pressable min-h-10 shrink-0 rounded-full border px-3 text-[11px] font-medium",
                activeCategory === category.id
                  ? "border-accent/40 bg-accent/10 text-foreground"
                  : "border-border bg-white text-muted"
              )}
            >
              {category.label}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <SocialEmptyState
          title={emptyCopy.title}
          description={emptyCopy.description}
          icon={Bell}
          secondaryLabel={
            emptyReason === "filtered" && activeCategory !== "all" ? "Show all" : undefined
          }
          onSecondary={
            emptyReason === "filtered" && activeCategory !== "all"
              ? () => setActiveCategory("all")
              : undefined
          }
        />
      ) : features.enableSmartNotifications && activeCategory === "all" ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.category} aria-label={group.label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </h3>
              <NotificationList items={group.items} />
            </section>
          ))}
        </div>
      ) : (
        <NotificationList items={filtered} />
      )}
    </div>
  );
});

const NotificationList = memo(function NotificationList({
  items,
}: {
  items: SocialNotification[];
}) {
  return (
    <ul className="space-y-2" aria-label="Notifications">
      {items.map((n) => {
        const href = notificationHref(n);
        const body = (
          <>
            <p className="text-foreground">
              {n.actor ? (
                <span className="font-medium">{n.actor.displayName}</span>
              ) : (
                <span className="font-medium">GigaSocial</span>
              )}{" "}
              <span className="text-muted">{fanNotificationMessage(n.type, n.message)}</span>
            </p>
            <p className="mt-1 text-xs text-muted">{formatRelativeTime(n.createdAt)}</p>
            {!n.read ? (
              <span className="sr-only">Unread</span>
            ) : null}
          </>
        );
        const className = cn(
          "gigasocial-pressable saas-card block rounded-xl border px-4 py-3 text-sm",
          n.read ? "border-border opacity-80" : "border-accent/30 bg-accent/5"
        );
        return (
          <li key={n._id}>
            {href ? (
              <Link href={href} className={className}>
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
});
