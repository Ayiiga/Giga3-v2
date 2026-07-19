"use client";

import { GigaSocialComposer } from "@/components/gigasocial/GigaSocialComposer";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ComponentProps } from "react";

type GigaSocialComposerSheetProps = {
  open: boolean;
  onClose: () => void;
} & ComponentProps<typeof GigaSocialComposer>;

export const GigaSocialComposerSheet = memo(function GigaSocialComposerSheet({
  open,
  onClose,
  onPosted,
  ...composerProps
}: GigaSocialComposerSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [fullscreenFlow, setFullscreenFlow] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setFullscreenFlow(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !fullscreenFlow) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullscreenFlow, onClose, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      {!fullscreenFlow ? (
        <div
          className="gigasocial-stable gigasocial-composer-overlay fixed inset-0 z-[60] bg-black/45"
          aria-hidden
          onClick={onClose}
        />
      ) : null}
      <div
        className={cn(
          fullscreenFlow
            ? "gigasocial-stable fixed inset-0 z-[60] pointer-events-none"
            : "gigasocial-stable gigasocial-composer-sheet fixed inset-x-0 bottom-0 z-[61] flex max-h-[min(92dvh,48rem)] flex-col border-t border-border bg-white shadow-2xl"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Create post"
        onClick={(event) => event.stopPropagation()}
      >
        {!fullscreenFlow ? (
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <p className="text-base font-semibold text-foreground">New post</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted hover:bg-muted/50"
              aria-label="Close composer"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        ) : null}
        <div
          className={cn(
            fullscreenFlow ? "pointer-events-auto" : "flex-1 overflow-y-auto overscroll-contain p-4"
          )}
        >
          <GigaSocialComposer
            {...composerProps}
            onFullscreenFlowChange={setFullscreenFlow}
            onPosted={() => {
              onPosted?.();
              onClose();
            }}
          />
        </div>
      </div>
    </>,
    document.body
  );
});
