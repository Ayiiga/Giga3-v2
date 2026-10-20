"use client";

import { cn } from "@/lib/utils";
import {
  GIGASOCIAL_SECTIONS,
  type GigaSocialSection,
} from "@/lib/gigasocial/sections";
import {
  recordAppOpen,
  shouldShowAttentionDot,
} from "@/lib/pwa/attentionDot";
import { Plus } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

/**
 * GigaSocial secondary navigation — inline top bar on mobile/tablet.
 * Must NOT be a fixed bottom bar (global primary nav owns the bottom).
 * Mirrors desktop section tabs so every section is reachable on small screens.
 * Inbox remains activity notifications; Messages is a separate optional entry.
 */
export const GigaSocialContextNav = memo(function GigaSocialContextNav({
  activeSection,
  unread = 0,
  showMessages = false,
  showLive = true,
  onNavigate,
  onCreate,
}: {
  activeSection: GigaSocialSection;
  unread?: number;
  /** Phase 2D — only when NEXT_PUBLIC_GIGASOCIAL_DM enables UI chrome. */
  showMessages?: boolean;
  showLive?: boolean;
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

  const items = useMemo(() => {
    type NavItem =
      | { kind: "section"; id: GigaSocialSection; label: string }
      | { kind: "create" };

    const sections = GIGASOCIAL_SECTIONS.filter((item) => {
      if (item.id === "live") return showLive;
      if (item.id === "messages") return showMessages;
      return true;
    }).map((item) => ({
      kind: "section" as const,
      id: item.id,
      label: item.id === "notifications" ? "Inbox" : item.label,
    }));

    // Keep Create near Discover for thumb reach; insert after Discover when present.
    const discoverIdx = sections.findIndex((s) => s.id === "discover");
    const insertAt = discoverIdx >= 0 ? discoverIdx + 1 : Math.min(2, sections.length);
    const withCreate: NavItem[] = [
      ...sections.slice(0, insertAt),
      { kind: "create" },
      ...sections.slice(insertAt),
    ];
    return withCreate;
  }, [showLive, showMessages]);

  return (
    <nav
      className="gigasocial-context-nav lg:hidden"
      aria-label="GigaSocial sections"
    >
      <div className="gigasocial-context-nav__scroll">
        {items.map((item) => {
          if (item.kind === "create") {
            return (
              <button
                key="create"
                type="button"
                className="gigasocial-context-nav__create"
                aria-label="Create post"
                onClick={onCreate}
              >
                <Plus className="h-5 w-5" aria-hidden />
                <span>Create</span>
              </button>
            );
          }

          const def = GIGASOCIAL_SECTIONS.find((s) => s.id === item.id);
          const Icon = def?.icon;
          const active = item.id === activeSection;
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
                onNavigate(item.id);
              }}
            >
              <span className="relative inline-flex">
                {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
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
