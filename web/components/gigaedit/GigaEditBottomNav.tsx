"use client";

import type { GigaEditSection } from "@/lib/gigaedit/types";
import {
  Clapperboard,
  FolderOpen,
  Home,
  Image as ImageIcon,
  Mic,
} from "lucide-react";

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
  { id: "teleprompter", label: "Teleprompt", icon: Mic },
  { id: "projects", label: "Projects", icon: FolderOpen },
];

export function GigaEditBottomNav({
  activeSection = "home",
  onOpenSection,
}: GigaEditBottomNavProps) {
  return (
    <nav
      className="gigaedit-bottom-nav gigaedit-bottom-nav--fixed"
      aria-label="GigaEdit navigation"
    >
      <div className="flex items-stretch gap-0.5">
        {STUDIO_TABS.map((item) => {
          const Icon = item.icon;
          const current = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={current ? "page" : undefined}
              className="gigaedit-bottom-nav__tab min-h-11"
              data-active={current}
              onClick={() => onOpenSection?.(item.id)}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
