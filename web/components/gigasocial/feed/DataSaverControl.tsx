"use client";

import {
  readDataSaverMode,
  readVideoQualityPreference,
  VIDEO_QUALITY_OPTIONS,
  writeDataSaverMode,
  writeVideoQualityPreference,
  type DataSaverMode,
  type VideoQualityId,
} from "@/lib/gigasocial/dataSaver";
import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

export const DataSaverControl = memo(function DataSaverControl({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DataSaverMode>("off");
  const [quality, setQuality] = useState<VideoQualityId>("auto");

  useEffect(() => {
    setMode(readDataSaverMode());
    setQuality(readVideoQualityPreference());
  }, []);

  const applyMode = useCallback((next: DataSaverMode) => {
    setMode(next);
    writeDataSaverMode(next);
  }, []);

  const applyQuality = useCallback((next: VideoQualityId) => {
    setQuality(next);
    writeVideoQualityPreference(next);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium",
          mode === "off"
            ? "border-border bg-white text-muted"
            : "border-emerald-300 bg-emerald-50 text-emerald-900"
        )}
        aria-expanded={open}
        aria-label="Data saver settings"
      >
        <Gauge className="h-3.5 w-3.5" aria-hidden />
        {mode === "ultra" ? "Ultra Saver" : mode === "saver" ? "Data Saver" : "Data"}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-border bg-white p-3 shadow-md">
          <p className="text-xs font-semibold text-foreground">Built for Africa</p>
          <p className="mt-0.5 text-[11px] text-muted">
            Save data on slow networks. Playback position is preserved when quality changes.
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            {(
              [
                ["off", "Off"],
                ["saver", "Saver"],
                ["ultra", "Ultra"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => applyMode(id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  mode === id
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                    : "border-border text-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-[11px] font-medium text-muted">
            Video quality
            <select
              value={quality}
              onChange={(event) => applyQuality(event.target.value as VideoQualityId)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-foreground"
            >
              {VIDEO_QUALITY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
});
