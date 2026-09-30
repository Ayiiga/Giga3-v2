"use client";

import { CurriculumSelector } from "@/components/gigalearn/CurriculumSelector";
import { Button } from "@/components/ui/Button";
import {
  saveStudioContext,
  studioContextSummary,
  type StudioContext,
} from "@/lib/gigalearn/studioContext";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { memo, useState } from "react";

interface StudioContextBarProps {
  ctx: StudioContext;
  onChange: (next: StudioContext) => void;
  idPrefix: string;
  changeLabel?: string;
}

/**
 * Shared persistent curriculum breadcrumb (Phase 3 additive).
 * Reuses the Phase 1 CurriculumSelector — no replacement.
 */
export const StudioContextBar = memo(function StudioContextBar({
  ctx,
  onChange,
  idPrefix,
  changeLabel = "Change",
}: StudioContextBarProps) {
  const [open, setOpen] = useState(false);
  const summary = studioContextSummary(ctx);

  return (
    <div
      className="sticky top-0 z-10 rounded-2xl border border-accent/25 bg-white/95 px-3 py-2.5 shadow-sm"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          {summary.length ? summary.join(" · ") : "Select your curriculum context to begin."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="min-h-9"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Done" : changeLabel}
          <ChevronDown className={cn("h-4 w-4", open && "rotate-180")} aria-hidden />
        </Button>
      </div>
      {open && (
        <div className="mt-3 border-t border-border pt-3">
          <CurriculumSelector
            value={ctx}
            onChange={(next) => onChange(saveStudioContext(next))}
            idPrefix={idPrefix}
          />
        </div>
      )}
    </div>
  );
});
