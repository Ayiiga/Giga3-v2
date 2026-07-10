"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { memo, useEffect, useState } from "react";

const FILTERS = [
  { id: "none", label: "Original" },
  { id: "brightness(1.08) contrast(1.05)", label: "Bright" },
  { id: "saturate(1.25)", label: "Vivid" },
  { id: "grayscale(0.35) contrast(1.1)", label: "Classic" },
  { id: "sepia(0.25) saturate(1.1)", label: "Warm" },
] as const;

export const GigaSocialMediaStudio = memo(function GigaSocialMediaStudio({
  previewUrl,
  onClose,
  onApplyFilter,
}: {
  previewUrl: string | null;
  onClose: () => void;
  onApplyFilter: (filterCss: string) => void;
}) {
  const [filter, setFilter] = useState<string>("none");

  useEffect(() => {
    setFilter("none");
  }, [previewUrl]);

  if (!previewUrl) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Photo Studio</p>
        <button type="button" className="text-xs text-muted hover:text-foreground" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-zinc-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Studio preview"
          className="max-h-56 w-full object-contain"
          style={{ filter: filter === "none" ? undefined : filter }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "min-h-8 rounded-full border px-3 text-xs font-medium",
              filter === item.id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border text-muted"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          className="min-h-9"
          onClick={() => {
            onApplyFilter(filter);
            onClose();
          }}
        >
          Apply filter
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Lightweight filters only — crop, music, and video trim open in future studio updates.
      </p>
    </div>
  );
});
