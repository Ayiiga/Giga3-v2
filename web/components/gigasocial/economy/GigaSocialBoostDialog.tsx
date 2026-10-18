"use client";

import { GigaSocialBoostPanel } from "@/components/gigasocial/economy/GigaSocialBoostPanel";
import { X } from "lucide-react";
import { memo, useEffect } from "react";

export const GigaSocialBoostDialog = memo(function GigaSocialBoostDialog({
  open,
  onClose,
  sessionToken,
  postId,
  postPreview,
}: {
  open: boolean;
  onClose: () => void;
  sessionToken: string;
  postId: string;
  postPreview?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Boost post"
        className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-[var(--gs-card,#0b1220)] text-white shadow-2xl sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="flex-1 text-base font-semibold">Boost post</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-white/80 hover:bg-white/10"
            aria-label="Close boost dialog"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        {postPreview ? (
          <p className="shrink-0 border-b border-white/10 px-4 py-2 text-xs text-white/70 line-clamp-2">
            {postPreview}
          </p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [&_.saas-card]:border-white/10 [&_.saas-card]:bg-white/5 [&_.text-foreground]:text-white [&_.text-muted]:text-white/65">
          <GigaSocialBoostPanel sessionToken={sessionToken} postId={postId} />
        </div>
      </div>
    </div>
  );
});
