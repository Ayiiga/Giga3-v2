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
    <div className="border-b border-border bg-black/30 px-4 py-4 sm:px-5">
      <label className="mb-3 block text-sm font-semibold uppercase tracking-wide text-muted">
        AI mode
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                "flex min-h-[52px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium shadow-sm transition-all sm:text-base",
                active
                  ? "border-blue-500/60 bg-blue-500/15 text-foreground shadow-blue-950/30"
                  : "border-border bg-card text-muted hover:border-blue-500/35 hover:text-foreground hover:shadow-md",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <Icon className="app-icon text-blue-400" aria-hidden />
              <span className="font-semibold leading-snug">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
