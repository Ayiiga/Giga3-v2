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
}

export function ToolSelector({ value, onChange, disabled }: ToolSelectorProps) {
  return (
    <div className="border-b border-border bg-black/30 px-4 py-3 sm:px-5">
      <label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-muted">
        AI mode
      </label>
      <div className="grid auto-cols-[minmax(140px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1 scrollbar-thin">
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
                "flex min-h-12 shrink-0 items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                active
                  ? "border-blue-500/50 bg-blue-500/15 text-foreground shadow-sm shadow-blue-500/10"
                  : "border-border bg-card text-muted hover:border-blue-500/30 hover:text-foreground",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <Icon className="shrink-0 text-blue-400" aria-hidden />
              <span className="font-medium whitespace-nowrap">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
