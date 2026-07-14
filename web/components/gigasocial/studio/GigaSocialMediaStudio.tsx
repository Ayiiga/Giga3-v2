"use client";

import { Button } from "@/components/ui/Button";
import {
  CAMERA_FILTERS,
  type CameraFilterId,
  getCameraFilterCss,
} from "@/lib/gigasocial/cameraFilters";
import { CAMERA_CAPTURE_MODES } from "@/lib/gigasocial/cameraModes";
import { cn } from "@/lib/utils";
import { memo, useEffect, useState } from "react";

export const GigaSocialMediaStudio = memo(function GigaSocialMediaStudio({
  previewUrl,
  onClose,
  onApplyFilter,
}: {
  previewUrl: string | null;
  onClose: () => void;
  onApplyFilter: (filterId: CameraFilterId) => void;
}) {
  const [filterId, setFilterId] = useState<CameraFilterId>("none");

  useEffect(() => {
    setFilterId("none");
  }, [previewUrl]);

  if (!previewUrl) return null;

  const activeCss = getCameraFilterCss(filterId);

  return (
    <div className="rounded-2xl border border-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Photo Studio</p>
        <button type="button" className="text-xs text-muted hover:text-foreground" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-zinc-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Studio preview"
          className="max-h-64 w-full object-contain"
          style={{ filter: activeCss }}
        />
      </div>
      <p className="mb-2 text-[11px] text-muted">
        AI capture modes apply non-destructive looks — your original file is preserved.
      </p>
      <div
        className="mb-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
        role="listbox"
        aria-label="Camera capture modes"
      >
        {CAMERA_CAPTURE_MODES.filter((mode) => mode.group === "capture").map((mode) => (
          <button
            key={mode.id}
            type="button"
            role="option"
            aria-selected={filterId === (mode.filterId ?? "none")}
            onClick={() => setFilterId(mode.filterId ?? "none")}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              filterId === (mode.filterId ?? "none")
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border text-muted"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <div
        className="mt-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
        role="listbox"
        aria-label="Camera filters"
      >
        {CAMERA_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={filterId === item.id}
              aria-label={`${item.label}${item.group === "premium" ? " premium preset" : ""}`}
              onClick={() => setFilterId(item.id)}
              className={cn(
              "min-w-[4.5rem] shrink-0 rounded-xl border p-1 text-center",
              filterId === item.id
                ? "border-accent/50 ring-2 ring-accent/25"
                : "border-border"
            )}
          >
            <span className="block overflow-hidden rounded-lg border border-border bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                className="h-14 w-full object-cover"
                style={{ filter: item.css === "none" ? undefined : item.css }}
              />
            </span>
            <span className="mt-1 block truncate px-0.5 text-[10px] font-medium text-foreground">
              {item.label}
              {item.group === "premium" ? (
                <span className="ml-1 text-[9px] uppercase text-violet-600">Pro</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          className="min-h-9"
          onClick={() => {
            onApplyFilter(filterId);
            onClose();
          }}
        >
          Apply filter
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Modern camera filters apply to your photo in the feed. Add music from the composer after
        choosing a photo.
      </p>
    </div>
  );
});
