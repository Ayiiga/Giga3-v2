"use client";

import {
  methodologiesForBand,
  selectMethodologiesForContext,
  type TeachingMethodologyId,
} from "@/lib/gigalearn/methodologies";
import type { LevelBand } from "@/lib/gigalearn/curriculumEngine";
import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";

interface MethodologyPickerProps {
  levelBand?: LevelBand;
  subjectId?: string;
  topic?: string;
  selectedIds: TeachingMethodologyId[];
  onChange: (ids: TeachingMethodologyId[]) => void;
  idPrefix: string;
  compact?: boolean;
}

export const MethodologyPicker = memo(function MethodologyPicker({
  levelBand,
  subjectId,
  topic,
  selectedIds,
  onChange,
  idPrefix,
  compact = false,
}: MethodologyPickerProps) {
  const options = useMemo(() => methodologiesForBand(levelBand), [levelBand]);

  const suggested = useMemo(
    () =>
      selectMethodologiesForContext({
        levelBand,
        subjectId,
        topic,
        max: 5,
      }).map((m) => m.id),
    [levelBand, subjectId, topic]
  );

  function toggle(id: TeachingMethodologyId) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id].slice(0, 6));
    }
  }

  function useSuggested() {
    onChange(suggested as TeachingMethodologyId[]);
  }

  if (!levelBand || (levelBand !== "early-years" && levelBand !== "primary")) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-zinc-50/80 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Teaching methods</p>
          <p className="text-xs text-muted">
            {compact
              ? "Methods shape generated activities for KG & Lower Primary."
              : "Pick methods for this lesson — AI weaves them into activities (not labels only)."}
          </p>
        </div>
        <button
          type="button"
          onClick={useSuggested}
          className="min-h-9 shrink-0 rounded-lg border border-accent/30 bg-white px-3 text-xs font-medium text-accent hover:bg-accent/5"
        >
          Suggest for topic
        </button>
      </div>
      <div
        className={cn(
          "mt-3 flex flex-wrap gap-2",
          compact && "max-h-32 overflow-y-auto overscroll-y-contain"
        )}
        role="group"
        aria-label="Teaching methodologies"
      >
        {options.map((m) => {
          const active = selectedIds.includes(m.id);
          const suggestedHit = suggested.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              id={`${idPrefix}-${m.id}`}
              aria-pressed={active}
              title={m.description}
              onClick={() => toggle(m.id)}
              className={cn(
                "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-accent/50 bg-accent/10 text-foreground ring-1 ring-accent/20"
                  : suggestedHit
                    ? "border-accent/20 bg-white text-foreground hover:border-accent/30"
                    : "border-border bg-white text-muted hover:border-accent/20"
              )}
            >
              {m.shortLabel}
            </button>
          );
        })}
      </div>
      {selectedIds.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted">
          No methods selected — AI will auto-pick suitable methods for this grade and topic.
        </p>
      ) : null}
    </div>
  );
});
