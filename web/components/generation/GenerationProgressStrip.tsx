"use client";

import { cn } from "@/lib/utils";

type GenerationProgressStripProps = {
  label: string;
  progress?: number;
  state?: "queued" | "processing" | "completed" | "failed";
  className?: string;
};

export function GenerationProgressStrip({
  label,
  progress,
  state = "processing",
  className,
}: GenerationProgressStripProps) {
  const pct = typeof progress === "number" ? Math.min(100, Math.max(4, progress)) : undefined;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={state === "processing" || state === "queued"}
      className={cn(
        "generation-progress rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
        <span>{label}</span>
        {state === "processing" && pct !== undefined ? (
          <span className="tabular-nums text-xs text-muted">{Math.round(pct)}%</span>
        ) : null}
      </div>
      {pct !== undefined ? (
        <div
          className="generation-progress-track mt-3 h-1.5 overflow-hidden rounded-full bg-violet-500/15"
          aria-hidden
        >
          <div
            className="generation-progress-fill h-full rounded-full bg-violet-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="generation-progress-indeterminate mt-3 h-1.5 overflow-hidden rounded-full bg-violet-500/15">
          <div className="generation-progress-fill h-full w-1/3 rounded-full bg-violet-500" />
        </div>
      )}
    </div>
  );
}
