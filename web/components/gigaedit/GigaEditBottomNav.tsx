"use client";

import { useInterfaceLanguage } from "@/components/providers/InterfaceLanguageProvider";
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
  frenchLabel: string;
  icon: typeof Home;
}[] = [
  { id: "home", label: "Home", frenchLabel: "Accueil", icon: Home },
  { id: "video", label: "Video", frenchLabel: "Vidéo", icon: Clapperboard },
  { id: "photo", label: "Photo", frenchLabel: "Photo", icon: ImageIcon },
  { id: "teleprompter", label: "Teleprompt", frenchLabel: "Prompteur", icon: Mic },
  { id: "projects", label: "Projects", frenchLabel: "Projets", icon: FolderOpen },
];

export function GigaEditBottomNav({
  activeSection = "home",
  onOpenSection,
}: GigaEditBottomNavProps) {
  const { language } = useInterfaceLanguage();
  return (
    <nav
      className="gigaedit-bottom-nav gigaedit-bottom-nav--fixed"
      lang={language}
      aria-label={language === "fr" ? "Navigation de GigaEdits" : "GigaEdit navigation"}
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
              <span className="truncate">{language === "fr" ? item.frenchLabel : item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
