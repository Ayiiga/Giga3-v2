"use client";

import { cn } from "@/lib/utils";
import type { GigaSocialSection } from "@/lib/gigasocial/sections";
import {
  recordAppOpen,
  shouldShowAttentionDot,
} from "@/lib/pwa/attentionDot";
import { Bell, Compass, Home, Plus, User } from "lucide-react";
import { memo, useEffect, useState } from "react";

type DockId = "feed" | "discover" | "create" | "notifications" | "profile";

const DOCK_ITEMS: {
  id: DockId;
  label: string;
  section?: GigaSocialSection;
  create?: boolean;
  icon: typeof Home;
}[] = [
  { id: "feed", label: "Home", section: "feed", icon: Home },
  { id: "discover", label: "Discover", section: "discover", icon: Compass },
  { id: "create", label: "Create", create: true, icon: Plus },
  { id: "notifications", label: "Inbox", section: "notifications", icon: Bell },
  { id: "profile", label: "Profile", section: "profile", icon: User },
];

export const GigaSocialBottomDock = memo(function GigaSocialBottomDock({
  activeSection,
  unread = 0,
  onNavigate,
  onCreate,
}: {
  activeSection: GigaSocialSection;
  unread?: number;
  onNavigate: (section: GigaSocialSection) => void;
  onCreate: () => void;
}) {
  const [attention, setAttention] = useState(() => shouldShowAttentionDot());

  useEffect(() => {
    // Capture 24h-away state once, then reset the clock so the next day can trigger again.
    if (shouldShowAttentionDot()) setAttention(true);
    recordAppOpen();
  }, []);

  useEffect(() => {
    if (activeSection === "feed" && attention) {
      setAttention(false);
    }
  }, [activeSection, attention]);

  return (
    <nav className="gigasocial-bottom-dock" aria-label="GigaSocial primary">
      <div className="gigasocial-bottom-dock__bar">
        {DOCK_ITEMS.map((item) => {
          if (item.create) {
            return (
              <button
                key={item.id}
                type="button"
                className="gigasocial-bottom-dock__item gigasocial-bottom-dock__create mx-auto"
                aria-label="Create post"
                onClick={onCreate}
              >
                <Plus className="h-6 w-6" aria-hidden />
              </button>
            );
          }

          const Icon = item.icon;
          const active = item.section === activeSection;
          const showAttention = item.id === "feed" && attention && unread === 0;
          return (
            <button
              key={item.id}
              type="button"
              className={cn("gigasocial-bottom-dock__item")}
              aria-current={active ? "true" : undefined}
              aria-label={
                showAttention ? `${item.label} (welcome back)` : item.label
              }
              onClick={() => {
                if (item.id === "feed") setAttention(false);
                if (item.section) onNavigate(item.section);
              }}
            >
              <span className="gigasocial-bottom-dock__icon relative">
                <Icon className="h-5 w-5" aria-hidden />
                {item.id === "notifications" && unread > 0 ? (
                  <span className="absolute -right-2 -top-1 rounded-full bg-[var(--gs-gold)] px-1 text-[9px] font-bold text-[#0b1220]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
                {showAttention ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[var(--gs-card,#0b1220)]"
                    aria-hidden
                  />
                ) : null}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
