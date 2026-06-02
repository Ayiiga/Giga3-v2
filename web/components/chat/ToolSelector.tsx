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
    <div className="border-b border-border bg-black/30 px-3 py-2 sm:px-4">
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted">
        AI mode
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
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
                "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all sm:text-sm",
                active
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border bg-card text-muted hover:border-violet-500/40 hover:text-foreground",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span className="font-medium whitespace-nowrap">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
