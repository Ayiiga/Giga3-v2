"use client";

import { cn } from "@/lib/utils";
import type { GigaSocialSection } from "@/lib/gigasocial/sections";
import { Bell, Compass, Home, Plus, User } from "lucide-react";
import { memo } from "react";

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
          return (
            <button
              key={item.id}
              type="button"
              className={cn("gigasocial-bottom-dock__item")}
              aria-current={active ? "true" : undefined}
              aria-label={item.label}
              onClick={() => item.section && onNavigate(item.section)}
            >
              <span className="gigasocial-bottom-dock__icon relative">
                <Icon className="h-5 w-5" aria-hidden />
                {item.id === "notifications" && unread > 0 ? (
                  <span className="absolute -right-2 -top-1 rounded-full bg-[var(--gs-gold)] px-1 text-[9px] font-bold text-[#0b1220]">
                    {unread > 9 ? "9+" : unread}
                  </span>
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
