"use client";

import type { GigaEditSection } from "@/lib/gigaedit/types";
import {
  Clapperboard,
  FolderOpen,
  Home,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

type GigaEditBottomNavProps = {
  activeSection?: GigaEditSection;
  onOpenSection?: (section: GigaEditSection) => void;
};

const STUDIO_TABS: {
  id: GigaEditSection;
  label: string;
  icon: typeof Home;
}[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "video", label: "Video", icon: Clapperboard },
  { id: "photo", label: "Photo", icon: ImageIcon },
  { id: "teleprompter", label: "Prompt", icon: Mic },
  { id: "projects", label: "Projects", icon: FolderOpen },
];

export function GigaEditBottomNav({
  activeSection = "home",
  onOpenSection,
}: GigaEditBottomNavProps) {
  return (
    <nav className="gigaedit-bottom-nav flex flex-col gap-1" aria-label="GigaEdit navigation">
      <div className="flex items-stretch gap-0.5">
        {STUDIO_TABS.map((item) => {
          const Icon = item.icon;
          const current = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={current ? "page" : undefined}
              className="min-h-11"
              onClick={() => onOpenSection?.(item.id)}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
        <Link href="/gigasocial/" className="min-h-11" aria-label="Open GigaSocial">
          <UsersRound className="h-4 w-4" aria-hidden />
          <span className="truncate">Social</span>
        </Link>
        <Link href="/chat" className="min-h-11" aria-label="Open Chat">
          <MessageSquare className="h-4 w-4" aria-hidden />
          <span className="truncate">Chat</span>
        </Link>
      </div>
    </nav>
  );
}
