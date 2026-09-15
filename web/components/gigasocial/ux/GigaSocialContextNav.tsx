"use client";

import { cn } from "@/lib/utils";
import type { GigaSocialSection } from "@/lib/gigasocial/sections";
import {
  recordAppOpen,
  shouldShowAttentionDot,
} from "@/lib/pwa/attentionDot";
import { Bell, Compass, Home, Plus, User } from "lucide-react";
import { memo, useEffect, useState } from "react";

type ContextNavId = "feed" | "discover" | "create" | "notifications" | "profile";

const CONTEXT_NAV_ITEMS: {
  id: ContextNavId;
  label: string;
  section?: GigaSocialSection;
  create?: boolean;
  icon: typeof Home;
}[] = [
  { id: "feed", label: "Feed", section: "feed", icon: Home },
  { id: "discover", label: "Discover", section: "discover", icon: Compass },
  { id: "create", label: "Create", create: true, icon: Plus },
  { id: "notifications", label: "Inbox", section: "notifications", icon: Bell },
  { id: "profile", label: "Profile", section: "profile", icon: User },
];

/**
 * GigaSocial secondary navigation — inline top bar on mobile/tablet.
 * Must NOT be a fixed bottom bar (global primary nav owns the bottom).
 */
export const GigaSocialContextNav = memo(function GigaSocialContextNav({
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
    if (shouldShowAttentionDot()) setAttention(true);
    recordAppOpen();
  }, []);

  useEffect(() => {
    if (activeSection === "feed" && attention) {
      setAttention(false);
    }
  }, [activeSection, attention]);

  return (
    <nav
      className="gigasocial-context-nav lg:hidden"
      aria-label="GigaSocial sections"
    >
      <div className="gigasocial-context-nav__scroll">
        {CONTEXT_NAV_ITEMS.map((item) => {
          if (item.create) {
            return (
              <button
                key={item.id}
                type="button"
                className="gigasocial-context-nav__create"
                aria-label="Create post"
                onClick={onCreate}
              >
                <Plus className="h-5 w-5" aria-hidden />
                <span>{item.label}</span>
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
              className={cn(
                "gigasocial-context-nav__item",
                active && "gigasocial-context-nav__item--active"
              )}
              aria-current={active ? "true" : undefined}
              aria-label={
                showAttention ? `${item.label} (welcome back)` : item.label
              }
              onClick={() => {
                if (item.id === "feed") setAttention(false);
                if (item.section) onNavigate(item.section);
              }}
            >
              <span className="relative inline-flex">
                <Icon className="h-4 w-4" aria-hidden />
                {item.id === "notifications" && unread > 0 ? (
                  <span className="absolute -right-2 -top-1 rounded-full bg-[var(--gs-gold)] px-1 text-[9px] font-bold text-[#0b1220]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
                {showAttention ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--gs-card,#0b1220)]"
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
