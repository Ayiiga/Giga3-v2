"use client";

import { AI_MODE_DEFINITIONS, type AiModeId } from "@/lib/aiRouter";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Code2,
  FileText,
  GraduationCap,
  MessageCircle,
  Newspaper,
  PenLine,
  School,
  Search,
  Share2,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  MessageCircle,
  Code2,
  GraduationCap,
  BookOpen,
  School,
  Search,
  FileText,
  PenLine,
  Share2,
  Newspaper,
};

interface ToolSelectorProps {
  value: AiModeId;
  onChange: (mode: AiModeId) => void;
  disabled?: boolean;
  /** When true, omits outer panel chrome (used inside ChatWorkspacePanel). */
  embedded?: boolean;
}

export function ToolSelector({
  value,
  onChange,
  disabled,
  embedded = false,
}: ToolSelectorProps) {
  return (
    <div
      className={cn(
        embedded ? "px-3 py-4 sm:px-4" : "border-b border-border bg-white px-4 py-4 sm:px-5"
      )}
    >
      {!embedded && (
        <label className="mb-3 block text-sm font-medium text-muted">
          AI mode
        </label>
      )}
      <div className="grid auto-cols-[minmax(160px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {AI_MODE_DEFINITIONS.map((mode) => {
          const Icon = ICONS[mode.icon] ?? MessageCircle;
          const active = value === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(mode.id)}
              title={mode.description}
              className={cn(
                "saas-card flex min-h-[3.75rem] shrink-0 items-center gap-3 px-4 py-3.5 text-left transition-all",
                active
                  ? "border-violet-500/50 bg-gradient-to-br from-violet-600/25 to-blue-600/15 text-foreground shadow-lg shadow-violet-500/15 ring-1 ring-violet-500/40"
                  : "text-muted hover:border-violet-500/30 hover:text-foreground",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <Icon
                className={cn("h-7 w-7 shrink-0", active ? "text-violet-300" : "text-blue-400")}
                aria-hidden
              />
              <span className="text-base font-semibold whitespace-nowrap">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
