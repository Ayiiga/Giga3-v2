"use client";

import type { GigaEditTimelineLane } from "@/lib/gigaedit/types";
import { overlayLanes, laneLabel } from "@/lib/gigaedit/timelineLanes";

type ImportModeDialogProps = {
  open: boolean;
  fileCount: number;
  onChoose: (mode: "main" | "overlay", overlayLane?: GigaEditTimelineLane) => void;
  onCancel: () => void;
};

export function ImportModeDialog({ open, fileCount, onChoose, onCancel }: ImportModeDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="gigaedit-glass w-full max-w-md space-y-4 p-5"
        role="dialog"
        aria-labelledby="import-mode-title"
      >
        <h3 id="import-mode-title" className="text-base font-bold">
          Add {fileCount} video{fileCount === 1 ? "" : "s"}
        </h3>
        <p className="text-sm text-[var(--ge-muted)]">
          Choose how new videos are placed. Existing clips are never overwritten without your
          confirmation.
        </p>
        <div className="grid gap-2">
          <button type="button" className="gigaedit-cta w-full" onClick={() => onChoose("main")}>
            Main Video track
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ge-muted)]">
            Overlay lane
          </p>
          {overlayLanes().map((lane) => (
            <button
              key={lane}
              type="button"
              className="gigaedit-cta gigaedit-cta--ghost w-full"
              onClick={() => onChoose("overlay", lane)}
            >
              {laneLabel(lane)}
            </button>
          ))}
          <button type="button" className="text-xs text-[var(--ge-muted)]" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
