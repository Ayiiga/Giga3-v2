"use client";

import {
  GIGA_REMIX_MODES,
  type GigaRemixModeId,
} from "@/lib/gigasocial/remixMeta";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { memo } from "react";
import { createPortal } from "react-dom";

/**
 * Giga Remix Studio — mode picker with original GigaSocial identity.
 * Modes seed the existing composer remix flow (body marker) — no new schema.
 */
export const GigaRemixStudio = memo(function GigaRemixStudio({
  post,
  open,
  onClose,
  onSelectMode,
}: {
  post: SocialPost;
  open: boolean;
  onClose: () => void;
  onSelectMode: (mode: GigaRemixModeId) => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-black/55 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Giga Remix Studio"
      onClick={onClose}
    >
      <div
        className="gigasocial-remix-studio max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-[var(--gs-card,#162033)] p-4 text-[var(--gs-text,#fff)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gs-gold,#fbbf24)]">
              Giga Remix
            </p>
            <h2 className="text-lg font-bold tracking-tight">
              Remix @{post.author.handle}
            </h2>
            <p className="mt-1 text-xs text-[var(--gs-muted,#94a3b8)]">
              Fresh collaboration tools with attribution — not a copy of anywhere else.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted"
            aria-label="Close remix studio"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {GIGA_REMIX_MODES.map((mode) => (
            <li key={mode.id}>
              <button
                type="button"
                className={cn(
                  "flex h-full w-full flex-col gap-1 rounded-xl border border-border bg-black/20 p-3 text-left",
                  "hover:border-accent/40 hover:bg-accent/5"
                )}
                onClick={() => onSelectMode(mode.id)}
              >
                <span className="text-lg" aria-hidden>
                  {mode.emoji}
                </span>
                <span className="text-sm font-semibold">{mode.label}</span>
                <span className="text-[11px] leading-snug text-muted">
                  {mode.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
});
