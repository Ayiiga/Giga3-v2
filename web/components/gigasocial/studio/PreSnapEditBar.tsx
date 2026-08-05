"use client";

import {
  CAMERA_FILTERS,
  type CameraFilterId,
} from "@/lib/gigasocial/cameraFilters";
import {
  CAMERA_CAPTURE_MODES,
  type CameraCaptureModeId,
} from "@/lib/gigasocial/cameraModes";
import { cn } from "@/lib/utils";
import { memo } from "react";

const PRE_SNAP_MODES = CAMERA_CAPTURE_MODES.filter(
  (mode) =>
    mode.group === "enhance" ||
    ["cinematic", "portrait", "hdr", "night", "natural", "film-look", "vivid"].includes(mode.id)
);

const PRE_SNAP_FILTERS = CAMERA_FILTERS.filter((filter) =>
  [
    "none",
    "natural",
    "portrait",
    "cinematic",
    "vivid",
    "noir",
    "film-look",
    "studio",
    "night",
    "social-creator",
  ].includes(filter.id)
);

export const PreSnapEditBar = memo(function PreSnapEditBar({
  filterId,
  onFilterChange,
  modeId,
  onModeChange,
  disabled,
  className,
}: {
  filterId: CameraFilterId;
  onFilterChange: (id: CameraFilterId) => void;
  modeId?: CameraCaptureModeId;
  onModeChange?: (id: CameraCaptureModeId) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {onModeChange ? (
        <div
          className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5"
          role="listbox"
          aria-label="Pre-snap looks"
        >
          {PRE_SNAP_MODES.map((mode) => {
            const active =
              modeId === mode.id ||
              (!modeId && filterId === (mode.filterId ?? "none") && mode.id === "natural");
            return (
              <button
                key={mode.id}
                type="button"
                role="option"
                aria-selected={active}
                disabled={disabled}
                onClick={() => {
                  onModeChange(mode.id);
                  if (mode.filterId) onFilterChange(mode.filterId);
                  else if (mode.id === "standard" || mode.id === "photo" || mode.id === "video") {
                    onFilterChange("none");
                  }
                }}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                  active ? "bg-white text-black" : "bg-white/15 text-white/90 hover:bg-white/25",
                  disabled && "opacity-50"
                )}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5"
        role="listbox"
        aria-label="Pre-snap filters"
      >
        {PRE_SNAP_FILTERS.map((filter) => {
          const active = filterId === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="option"
              aria-selected={active}
              disabled={disabled}
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "flex min-w-[3.5rem] shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-1",
                active ? "bg-white/20 ring-1 ring-white/70" : "bg-transparent",
                disabled && "opacity-50"
              )}
            >
              <span
                className="h-9 w-9 rounded-full border border-white/30 bg-gradient-to-br from-zinc-200 to-zinc-600"
                style={{
                  filter: filter.css === "none" ? undefined : filter.css,
                }}
                aria-hidden
              />
              <span className="text-[9px] font-medium text-white/90">{filter.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-[10px] text-white/55">
        Edit look before you snap — applied to photos and previewed on video.
      </p>
    </div>
  );
});
