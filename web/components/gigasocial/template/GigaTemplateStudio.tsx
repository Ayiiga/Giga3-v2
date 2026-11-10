"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  GIGA_TEMPLATE_MODES,
  type GigaTemplateModeId,
} from "@/lib/gigasocial/templateMeta";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type GigaTemplateStudioProps = {
  post: SocialPost;
  open: boolean;
  availableModes: GigaTemplateModeId[];
  attributionLine: string;
  onClose: () => void;
  onStart: (mode: GigaTemplateModeId, userIdea: string) => void;
  loading?: boolean;
  error?: string | null;
};

export const GigaTemplateStudio = memo(function GigaTemplateStudio({
  post,
  open,
  availableModes,
  attributionLine,
  onClose,
  onStart,
  loading,
  error,
}: GigaTemplateStudioProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<GigaTemplateModeId | null>(null);
  const [userIdea, setUserIdea] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode(null);
    setUserIdea("");
  }, [open, post._id]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const modes = GIGA_TEMPLATE_MODES.filter((m) => availableModes.includes(m.id));
  const blocked = Boolean(error);
  const waiting = Boolean(loading && !modes.length && !blocked);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto h-fit max-h-[80dvh] w-[calc(100%_-_1.5rem)] max-w-lg overflow-hidden rounded-2xl bg-transparent p-0 backdrop:bg-black/60 sm:inset-y-0 sm:my-auto"
      aria-label="Use as Template"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="gigasocial-template-studio max-h-[80dvh] overscroll-contain w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-[var(--gs-card,#162033)] p-4 text-[var(--gs-text,#fff)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gs-gold,#fbbf24)]">
              Use as Template
            </p>
            <h2 className="text-lg font-bold tracking-tight">@{post.author.handle}</h2>
            <p className="mt-1 text-xs text-[var(--gs-muted,#94a3b8)]">
              Giga3 uses post metadata to suggest structure and style — your result stays original.{" "}
              {attributionLine}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted"
            aria-label="Close template studio"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {error}
          </p>
        ) : null}

        {waiting ? (
          <LoadingState label="Checking template permissions…" className="py-8" />
        ) : !mode ? (
          modes.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {modes.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={loading || blocked}
                    className={cn(
                      "grid h-full w-full grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0.5 rounded-xl border border-border bg-black/20 p-2.5 text-left",
                      "hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50"
                    )}
                    onClick={() => setMode(item.id)}
                  >
                    <span className="text-lg" aria-hidden>
                      {item.emoji}
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="col-start-2 text-xs leading-snug text-[var(--gs-muted,#94a3b8)]">{item.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-border bg-black/20 px-3 py-4 text-sm text-muted">
              No template modes are available for this post.
            </p>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {GIGA_TEMPLATE_MODES.find((m) => m.id === mode)?.label}
            </p>
            <label className="block text-sm">
              <span className="font-medium">Your new idea or topic</span>
              <textarea
                className="input-surface mt-2 min-h-28 w-full"
                placeholder='Example: "Create a funny Ghanaian relationship comedy about couples arguing over mobile data."'
                value={userIdea}
                onChange={(e) => setUserIdea(e.target.value)}
              />
            </label>
            <p className="text-xs text-muted">
              Giga3 generates original content from your idea and structural hints — never copies the
              source post media. The original GigaSocial post is never modified.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setMode(null)}>
                Back
              </Button>
              <Button
                type="button"
                className="flex-1 gap-2"
                disabled={loading || blocked || !userIdea.trim()}
                onClick={() => onStart(mode, userIdea.trim())}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Generate with AI
              </Button>
            </div>
          </div>
        )}
      </div>
    </dialog>,
    document.body
  );
});
