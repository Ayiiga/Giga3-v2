"use client";

import type { GigaCreateActionId } from "@/components/gigasocial/create/gigaCreateMenu";
import { cn } from "@/lib/utils";
import {
  Camera,
  Clapperboard,
  ImagePlus,
  Music2,
  Plus,
  Sparkles,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CreatorAction = {
  id: GigaCreateActionId;
  title: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
};

const ACTIONS: CreatorAction[] = [
  { id: "media-video", title: "Video", detail: "Upload, preview and polish a clip", icon: Clapperboard, tone: "from-violet-500/20 to-indigo-500/10" },
  { id: "media-photo", title: "Photo", detail: "Create a bright, beautiful post", icon: ImagePlus, tone: "from-pink-500/20 to-rose-500/10" },
  { id: "media-unified", title: "Music", detail: "Give your photo story a soundtrack", icon: Music2, tone: "from-amber-500/20 to-orange-500/10" },
  { id: "media-camera", title: "Camera", detail: "Capture something in the moment", icon: Camera, tone: "from-cyan-500/20 to-sky-500/10" },
  { id: "text-post", title: "Post", detail: "Share an idea, update or announcement", icon: Type, tone: "from-emerald-500/20 to-teal-500/10" },
  { id: "story-content", title: "Story", detail: "Share a moment that lasts 24 hours", icon: Sparkles, tone: "from-fuchsia-500/20 to-purple-500/10" },
];

export const GigaCreatorHub = memo(function GigaCreatorHub({
  disabled,
  openSignal = 0,
  onSelect,
}: {
  disabled?: boolean;
  openSignal?: number;
  onSelect: (action: GigaCreateActionId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const lastHandledOpenSignalRef = useRef(0);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (disabled) {
      setOpen(false);
      return;
    }
    if (openSignal <= lastHandledOpenSignalRef.current) return;
    lastHandledOpenSignalRef.current = openSignal;
    setOpen(true);
  }, [disabled, openSignal]);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [close, open]);

  if (!mounted) return null;

  return createPortal(
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close creator hub"
          className="fixed inset-0 z-[68] bg-slate-950/65 backdrop-blur-[3px]"
          onClick={close}
        />
      ) : null}
      <div className={cn("pointer-events-none fixed inset-x-0 bottom-[calc(var(--primary-nav-offset)+var(--primary-nav-height)+1.75rem)] z-[69] flex justify-end p-4 pb-0 lg:bottom-0 lg:pb-4", disabled && "hidden")}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close creator hub" : "Open creator hub"}
          aria-expanded={open}
          aria-hidden={open}
          tabIndex={open ? -1 : 0}
          className={cn(
            "pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_12px_35px_rgba(79,70,229,.42)] transition duration-200 active:scale-95",
            "bg-gradient-to-br from-violet-500 via-indigo-600 to-blue-700 ring-1 ring-white/30",
            disabled && "cursor-not-allowed opacity-50",
            open && "rotate-45 pointer-events-none opacity-0"
          )}
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
        </button>
      </div>
      {open ? (
        <section
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="GigaSocial Creator Hub"
          className="gigasocial-stable fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[min(92dvh,760px)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-[2rem] border border-white/10 bg-[#091326] text-white shadow-[0_-20px_80px_rgba(2,6,23,.55)]"
        >
          <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-white/20" />
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.22em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" /> Creator tools
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Make something brilliant.</h2>
                <p className="mt-1 text-sm text-slate-400">Choose how you want to create today.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      close();
                      onSelect(action.id);
                    }}
                    className="group min-h-[126px] rounded-2xl border border-white/[.09] bg-white/[.045] p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-300/40 hover:bg-white/[.08] active:scale-[.98]"
                  >
                    <span className={cn("mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br", action.tone)}>
                      <Icon className="h-5 w-5 text-white" strokeWidth={1.9} />
                    </span>
                    <span className="block text-sm font-semibold text-white">{action.title}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{action.detail}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" /> Preview • Edit • Publish
            </div>
          </div>
        </section>
      ) : null}
    </>,
    document.body
  );
});
