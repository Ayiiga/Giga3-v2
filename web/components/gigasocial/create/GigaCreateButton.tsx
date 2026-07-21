"use client";

import {
  getGigaCreateFabItems,
  type GigaCreateActionId,
  type GigaCreateMenuItem,
} from "@/components/gigasocial/create/gigaCreateMenu";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type GigaCreateLaunch = {
  action: GigaCreateActionId;
};

export const GigaCreateButton = memo(function GigaCreateButton({
  disabled,
  enableLive = true,
  enableAIStudio = false,
  onSelect,
  onOpenAIStudio,
}: {
  disabled?: boolean;
  enableLive?: boolean;
  enableAIStudio?: boolean;
  onSelect: (launch: GigaCreateLaunch) => void;
  onOpenAIStudio?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const menuItems = useMemo(
    () => getGigaCreateFabItems({ enableLive }),
    [enableLive]
  );

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  const handleSelect = useCallback(
    (item: GigaCreateMenuItem) => {
      if (item.disabled) return;
      onSelect({ action: item.id });
      close();
    },
    [close, onSelect]
  );

  const handleOpenAIStudio = useCallback(() => {
    onOpenAIStudio?.();
    close();
  }, [close, onOpenAIStudio]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  if (!mounted) return null;

  const fab = (
    <button
      type="button"
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "gigasocial-create-fab-button inline-flex h-14 w-14 items-center justify-center rounded-full border border-violet-300/50 bg-violet-600 text-white shadow-lg",
        open && "gigasocial-create-fab-button--open",
        disabled && "opacity-50"
      )}
      aria-label={open ? "Close upload menu" : "Open upload menu"}
      aria-expanded={open}
      aria-haspopup="menu"
    >
      {open ? <X className="h-6 w-6" aria-hidden /> : <Plus className="h-6 w-6" aria-hidden />}
    </button>
  );

  return createPortal(
    <>
      {open ? (
        <div
          className="gigasocial-stable gigasocial-create-overlay fixed inset-0 z-[60] bg-black/40"
          aria-hidden
          onClick={close}
        />
      ) : null}

      <div className="gigasocial-stable gigasocial-create-fab pointer-events-none fixed inset-x-0 bottom-0 z-[61] flex flex-col items-stretch justify-end pb-[env(safe-area-inset-bottom)]">
        {open ? (
          <div
            className="gigasocial-upload-sheet pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Upload"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="gigasocial-upload-sheet__handle" aria-hidden />
            <div className="gigasocial-upload-sheet__header">
              <p className="text-base font-semibold text-foreground">Create</p>
              <p className="mt-0.5 text-xs text-muted">Choose what to share</p>
            </div>
            <div className="gigasocial-upload-sheet__list" role="menu">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  aria-disabled={item.disabled}
                  className={cn(
                    "gigasocial-upload-sheet__item",
                    item.disabled && "cursor-not-allowed opacity-60"
                  )}
                  onClick={() => handleSelect(item)}
                >
                  <span className="gigasocial-upload-sheet__emoji" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="block text-xs leading-relaxed text-muted">{item.description}</span>
                  </span>
                </button>
              ))}
              {enableAIStudio ? (
                <button
                  type="button"
                  role="menuitem"
                  className="gigasocial-upload-sheet__item"
                  onClick={handleOpenAIStudio}
                >
                  <span className="gigasocial-upload-sheet__emoji" aria-hidden>
                    ✦
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">AI Studio</span>
                    <span className="block text-xs leading-relaxed text-muted">
                      Teleprompter, scripts, thumbnails, captions, and more
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
            <div className="gigasocial-upload-sheet__fab-row">{fab}</div>
          </div>
        ) : (
          <div className="pointer-events-auto flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {fab}
          </div>
        )}
      </div>
    </>,
    document.body
  );
});
