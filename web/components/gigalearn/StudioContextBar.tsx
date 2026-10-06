"use client";

import { CurriculumSelector } from "@/components/gigalearn/CurriculumSelector";
import { Button } from "@/components/ui/Button";
import {
  saveStudioContext,
  studioContextSummary,
  type StudioContext,
} from "@/lib/gigalearn/studioContext";
import { cn } from "@/lib/utils";
import { MethodologyPicker } from "@/components/gigalearn/MethodologyPicker";
import { getLevel, resolveLegacyLevelId } from "@/lib/gigalearn/curriculumEngine";
import type { TeachingMethodologyId } from "@/lib/gigalearn/methodologies";
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
      className="gigalearn-context-bar rounded-2xl border border-accent/25 bg-white px-3 py-2.5 shadow-sm"
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
        <div className="mt-3 space-y-4 border-t border-border pt-3">
          <CurriculumSelector
            value={ctx}
            onChange={(next) => onChange(saveStudioContext(next))}
            idPrefix={idPrefix}
          />
          <MethodologyPicker
            levelBand={getLevel(resolveLegacyLevelId(ctx.levelId))?.band}
            subjectId={ctx.subjectId}
            topic={ctx.topic}
            selectedIds={ctx.methodologyIds ?? []}
            onChange={(methodologyIds) =>
              onChange(saveStudioContext({ ...ctx, methodologyIds: methodologyIds as TeachingMethodologyId[] }))
            }
            idPrefix={`${idPrefix}-method`}
            compact
          />
        </div>
      )}
    </div>
  );
});
