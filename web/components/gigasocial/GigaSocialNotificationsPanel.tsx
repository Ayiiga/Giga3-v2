"use client";

import { NotificationsSkeleton } from "@/components/gigasocial/ux/PanelSkeletons";
import { SocialEmptyState } from "@/components/gigasocial/ux/SocialEmptyState";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/datetime";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import {
  filterNotificationsByPrefs,
  groupNotifications,
  notificationDisplayMessage,
  notificationDestination,
  loadNotificationPrefs,
  NOTIFICATION_CATEGORIES,
  saveNotificationPrefs,
  type NotificationCategoryId,
  type NotificationPrefs,
} from "@/lib/gigasocial/notificationGroups";
import type { SocialNotification } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Bell, Settings2, Heart, MessageCircle, UserPlus, ArrowUpRight, CheckCheck, Image as ImageIcon } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";

export const GigaSocialNotificationsPanel = memo(function GigaSocialNotificationsPanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const features = useGigaSocialFeatures();
  const data = useQuery(api.gigaSocial.listNotifications, { sessionToken, limit: 40 });
  const markRead = useMutation(api.gigaSocial.markNotificationsRead);
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  async function handleRead(n?: SocialNotification) {
    if (pending) return;
    setPending(n?._id ?? "all");
    setFeedback("");
    try {
      if (!n || !n.read) {
        const result = await markRead({ sessionToken, ...(n ? { notificationId: n._id as Id<"socialNotifications"> } : {}) });
        if (!result.ok) throw new Error("Unable to mark activity read");
      }
      const destination = n ? notificationDestination(n) : null;
      if (destination) router.push(destination.href);
      else setFeedback(n ? "Notification marked as read." : "All notifications marked as read.");
    } catch {
      setFeedback("Could not complete the action. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }
  const [prefs, setPrefs] = useState<NotificationPrefs>({});
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategoryId | "all">("all");

  useEffect(() => {
    setPrefs(loadNotificationPrefs());
  }, []);

  const notifications = useMemo(() => {
    const seen = new Set<string>();
    return ((data?.notifications ?? []) as SocialNotification[]).filter((entry) => {
      const actor = entry.actor?.userId ?? entry.actor?.handle;
      if (entry.type !== "follow" || !actor) return true;
      const key = `${actor}:${Math.floor(entry.createdAt / 86_400_000)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.notifications]);

  const filtered = useMemo(() => {
    const byPrefs = features.enableSmartNotifications
      ? filterNotificationsByPrefs(notifications, prefs)
      : notifications;
    const visible = unreadOnly ? byPrefs.filter((n) => !n.read) : byPrefs;
    if (!features.enableSmartNotifications || activeCategory === "all") return visible;
    return groupNotifications(visible).find((g) => g.category === activeCategory)?.items ?? [];
  }, [activeCategory, features.enableSmartNotifications, notifications, prefs, unreadOnly]);

  const groups = useMemo(
    () => (features.enableSmartNotifications ? groupNotifications(filtered) : []),
    [features.enableSmartNotifications, filtered]
  );

  if (data === undefined) {
    return <NotificationsSkeleton />;
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="gigasocial-inbox-summary rounded-2xl border p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white"><Bell className="h-5 w-5" aria-hidden /></span>
          <div className="min-w-0"><h3 className="font-semibold text-foreground">Your activity</h3><p className="text-xs text-muted">Open a notification to see what happened.</p></div>
        </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {data.unreadCount > 0
            ? `${data.unreadCount} unread notification${data.unreadCount === 1 ? "" : "s"}`
            : "No unread notifications."}
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
              disabled={pending !== null}
              onClick={() => void handleRead()}
              className="min-h-10"
            >
              <CheckCheck className="mr-1 h-4 w-4" aria-hidden />
              {pending === "all" ? "Marking…" : "Mark all read"}
            </Button>
          ) : null}
        </div>
      </div>

        <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(v => !v)} className={cn("mt-3 min-h-11 rounded-xl border px-3 text-sm font-medium", unreadOnly ? "border-violet-400 bg-violet-600 text-white" : "border-border text-foreground")}>{unreadOnly ? "Showing unread · Show all" : "Show unread only"}</button>
        {feedback && <p role="status" className="mt-2 text-sm text-foreground">{feedback}</p>}
      </div>

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
                    if (activeCategory === category.id && !next[category.id]) setActiveCategory("all");
                  }}
                  aria-pressed={enabled}
                  className={cn(
                    "gigasocial-pressable min-h-11 rounded-full border px-2.5 text-[11px] font-medium",
                    enabled
                      ? "border-accent/40 bg-accent/10 text-foreground"
                      : "border-border bg-card text-muted line-through"
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
          className="gigasocial-inbox-filters flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pb-1"
          role="tablist"
          aria-label="Notification filters"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            className={cn(
              "gigasocial-pressable min-h-11 shrink-0 rounded-full border px-2.5 text-[11px] font-medium",
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
                "gigasocial-pressable min-h-11 shrink-0 rounded-full border px-2.5 text-[11px] font-medium",
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
          title={unreadOnly ? "No unread notifications here." : "No notifications in this view."}
          description="Try another filter or check notification controls to see more activity."
          icon={Bell}
        />
      ) : features.enableSmartNotifications && activeCategory === "all" ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.category} aria-label={group.label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </h3>
              <NotificationList items={group.items} pending={pending} onOpen={handleRead} />
            </section>
          ))}
        </div>
      ) : (
        <NotificationList items={filtered} pending={pending} onOpen={handleRead} />
      )}
    </div>
  );
});

const NotificationList = memo(function NotificationList({
  items, pending, onOpen,
}: {
  items: SocialNotification[];
  pending: string | null;
  onOpen: (n: SocialNotification) => Promise<void>;
}) {
  return (
    <ul className="space-y-2">
      {items.map((n) => {
        const destination = notificationDestination(n);
        const Icon = n.type === "like" ? Heart : n.type === "follow" ? UserPlus : /comment|reply|mention/.test(n.type) ? MessageCircle : n.type === "creator" ? ImageIcon : Bell;
        const actionable = !!destination || !n.read;
        const content = (
          <>
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", n.type === "like" ? "bg-rose-500/20 text-rose-400" : n.type === "follow" ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-500/20 text-violet-400")}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-medium text-foreground">{notificationDisplayMessage(n)}</span>
              <span className="mt-1 block text-xs text-muted">{formatRelativeTime(n.createdAt)} · {n.read ? "Read" : "New"}</span>
              {actionable && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent">{pending === n._id ? "Opening…" : destination?.label ?? "Mark as read"}{destination && <ArrowUpRight className="h-3 w-3" aria-hidden />}</span>}
            </span>
            {!n.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" aria-label="Unread" />}
          </>
        );
        return (
          <li key={n._id} className={cn("saas-card min-w-0 rounded-xl border", n.read ? "border-border" : "border-violet-400/40 bg-violet-500/10")}>
            {actionable ? <button type="button" disabled={pending !== null} onClick={() => void onOpen(n)} className="flex min-h-14 w-full min-w-0 items-start gap-3 rounded-xl p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-70">{content}</button> : <div className="flex min-w-0 items-start gap-3 p-3">{content}</div>}
          </li>
        );
      })}
    </ul>
  );
});
