"use client";

import {
  Captions,
  Layers,
  Music2,
  Scissors,
  Sparkles,
  SplitSquareVertical,
  Sticker,
  Trash2,
  Type,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type VideoEditorToolTab =
  | "edit"
  | "split"
  | "audio"
  | "noise"
  | "text"
  | "stickers"
  | "overlays"
  | "effects"
  | "captions"
  | "delete";

const TABS: Array<{
  id: VideoEditorToolTab;
  label: string;
  icon: LucideIcon;
  badge?: string;
}> = [
  { id: "edit", label: "Edit", icon: Scissors },
  { id: "split", label: "Split", icon: SplitSquareVertical },
  { id: "audio", label: "Audio", icon: Music2 },
  { id: "noise", label: "Noise", icon: Volume2, badge: "AI" },
  { id: "text", label: "Text", icon: Type },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "overlays", label: "Overlays", icon: Layers },
  { id: "effects", label: "Effects", icon: Sparkles },
  { id: "captions", label: "Captions", icon: Captions },
  { id: "delete", label: "Delete", icon: Trash2 },
];

type VideoEditorToolStripProps = {
  activeTab: VideoEditorToolTab;
  onTabChange: (tab: VideoEditorToolTab) => void;
  panel: ReactNode;
};

export function VideoEditorToolStrip({ activeTab, onTabChange, panel }: VideoEditorToolStripProps) {
  return (
    <div className="gigaedit-editor-toolstrip">
      {panel ? (
        <div className="gigaedit-editor-toolpanel" role="region" aria-label={`${activeTab} tools`}>
          {panel}
        </div>
      ) : null}

      <nav className="gigaedit-editor-tooltabs" aria-label="Editor tools">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-active={active}
              className="gigaedit-editor-tooltab"
              onClick={() => onTabChange(tab.id)}
            >
              <span className="relative inline-flex">
                <Icon className="h-5 w-5" aria-hidden />
                {tab.badge ? (
                  <span className="gigaedit-editor-tooltab-badge">{tab.badge}</span>
                ) : null}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function ToolGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{children}</div>;
}

export function ToolTile({
  label,
  onClick,
  disabled,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn("gigaedit-editor-tooltile", disabled && "opacity-40")}
    >
      {Icon ? <Icon className="mx-auto mb-1 h-4 w-4 opacity-80" aria-hidden /> : null}
      {label}
    </button>
  );
}

export function ToolPanelHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-[var(--ge-muted)]">{children}</p>;
}
