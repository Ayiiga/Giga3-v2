"use client";

import { useState } from "react";
import { Expand } from "lucide-react";
import { ChatImageDialog } from "@/components/chat/ChatImageDialog";

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
      {open && <ChatImageDialog url={src} label={label} onClose={() => setOpen(false)} />}
    </>
  );
}
