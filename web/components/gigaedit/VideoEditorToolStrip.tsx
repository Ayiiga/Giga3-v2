"use client";

import { Captions, Music2, Scissors, Sparkles, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type VideoEditorToolTab = "edit" | "audio" | "text" | "effects" | "captions";

const TABS: Array<{ id: VideoEditorToolTab; label: string; icon: typeof Scissors; badge?: string }> =
  [
    { id: "edit", label: "Edit", icon: Scissors },
    { id: "audio", label: "Audio", icon: Music2 },
    { id: "text", label: "Text", icon: Type },
    { id: "effects", label: "Effects", icon: Sparkles, badge: "AI" },
    { id: "captions", label: "Captions", icon: Captions },
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
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "gigaedit-editor-tooltile",
        disabled && "opacity-40"
      )}
    >
      {label}
    </button>
  );
}
