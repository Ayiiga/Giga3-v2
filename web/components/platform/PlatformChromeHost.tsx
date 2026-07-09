"use client";

import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { NotificationBell, NotificationCenter } from "@/components/notifications/NotificationCenter";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { MessageSquarePlus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PlatformChromeHostProps = {
  conversations?: { id: string; title: string; mode: string }[];
  showNotifications?: boolean;
  compact?: boolean;
  ultraCompact?: boolean;
};

function NotificationBellWithCount({ onClick }: { onClick: () => void }) {
  const sessionToken = getSessionToken();
  const notifData = useQuery(
    api.platformNotifications.listNotifications,
    sessionToken ? { sessionToken, limit: 5 } : "skip"
  );
  return (
    <NotificationBell onClick={onClick} unreadCount={notifData?.unreadCount ?? 0} />
  );
}

/** Global search, notifications, and feedback — keyboard shortcut Ctrl+K / Cmd+K */
export function PlatformChromeHost({
  conversations,
  showNotifications = true,
  compact = false,
  ultraCompact = false,
}: PlatformChromeHostProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const sessionToken = getSessionToken();

  const openSearch = useCallback(() => setSearchOpen(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={openSearch}
          className="rounded-xl p-2 text-muted hover:bg-accent/10 hover:text-foreground"
          aria-label="Search (Ctrl+K)"
          title="Search (Ctrl+K)"
        >
          <Search className="h-4 w-4" aria-hidden />
          {!compact && <span className="sr-only">Search</span>}
        </button>

        {showNotifications && sessionToken && (
          <NotificationBellWithCount onClick={() => setNotifOpen(true)} />
        )}

        {!ultraCompact && (
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="rounded-xl p-2 text-muted hover:bg-accent/10 hover:text-foreground"
            aria-label="Send feedback"
            title="Send feedback"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        conversations={conversations}
      />
      {showNotifications && sessionToken && (
        <ConvexAppShell>
          <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
        </ConvexAppShell>
      )}
      {feedbackOpen && (
        <ConvexAppShell>
          <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
        </ConvexAppShell>
      )}
    </>
  );
}

/** Marketing header chrome — no Convex hooks (safe outside ConvexProvider). */
export function MarketingPlatformChrome({ compact = false }: { compact?: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="rounded-xl p-2 text-muted hover:bg-accent/10 hover:text-foreground"
          aria-label="Search (Ctrl+K)"
          title="Search (Ctrl+K)"
        >
          <Search className="h-4 w-4" aria-hidden />
          {!compact && <span className="sr-only">Search</span>}
        </button>
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="rounded-xl p-2 text-muted hover:bg-accent/10 hover:text-foreground"
          aria-label="Send feedback"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      {feedbackOpen && (
        <ConvexAppShell>
          <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
        </ConvexAppShell>
      )}
    </>
  );
}
