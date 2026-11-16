"use client";

import { useEffect, useState } from "react";
import { Expand, X } from "lucide-react";

/**
 * Uploaded-image thumbnails already live inside the user's saved chat message
 * as tiny data URLs. Render them directly, even with Data Saver/3G enabled:
 * there is no network download to defer.
 */
export function ChatUploadedImagePreview({
  src,
  index,
}: {
  src: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const label = `View attached image ${index + 1}`;
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
        className="group relative flex aspect-[4/3] w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-white/95 p-1 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white dark:bg-zinc-900"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Attached image ${index + 1}`}
          loading="eager"
          decoding="async"
          className="h-full w-full rounded-lg object-contain"
        />
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-zinc-900/75 p-1 text-white opacity-90">
          <Expand className="h-3.5 w-3.5" aria-hidden />
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close image preview"
            className="absolute right-4 top-4 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-zinc-900"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Attached image ${index + 1} full view`}
            className="max-h-[80dvh] max-w-full rounded-xl object-contain"
          />
          <p className="mt-3 text-sm text-white/80">Image {index + 1} · Tap X to close</p>
        </div>
      ) : null}
    </>
  );
}
