"use client";

import {
  GIGA_CREATE_MENU,
  type GigaCreateActionId,
  type GigaCreateMenuItem,
} from "@/components/gigasocial/create/gigaCreateMenu";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type GigaCreateLaunch = {
  action: GigaCreateActionId;
};

export const GigaCreateButton = memo(function GigaCreateButton({
  disabled,
  menuItems = GIGA_CREATE_MENU,
  onSelect,
}: {
  disabled?: boolean;
  menuItems?: GigaCreateMenuItem[];
  onSelect: (launch: GigaCreateLaunch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);

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
        open && "rotate-45",
        disabled && "opacity-50"
      )}
      aria-label={open ? "Close GigaCreate" : "Open GigaCreate"}
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
          className="gigasocial-stable gigasocial-create-overlay fixed inset-0 z-[60] bg-black/45"
          aria-hidden
          onClick={close}
        />
      ) : null}

      <div className="gigasocial-stable gigasocial-create-fab pointer-events-none fixed inset-x-0 bottom-0 z-[61] flex flex-col items-stretch justify-end pb-[env(safe-area-inset-bottom)]">
        {open ? (
          <div
            className="gigasocial-create-menu pointer-events-auto border-t border-border bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="GigaCreate options"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-base font-semibold text-foreground">Create</p>
              <p className="mt-0.5 text-xs text-muted">
                Share video, photos, learning content, and more.
              </p>
            </div>
            <div
              className="max-h-[min(65dvh,26rem)] overflow-y-auto overscroll-contain px-2 py-2"
              role="menu"
            >
              {menuItems.map((item) => {
                const isSecondary = item.id === "remix";
                const isDisabled = item.disabled === true;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left",
                      isSecondary && "bg-slate-50",
                      isDisabled
                        ? "cursor-not-allowed opacity-60"
                        : isSecondary
                          ? "hover:bg-slate-100 active:bg-slate-100"
                          : "hover:bg-accent/5 active:bg-accent/10"
                    )}
                    onClick={() => {
                      if (isDisabled) return;
                      onSelect({ action: item.id });
                      close();
                    }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg"
                      aria-hidden
                    >
                      {item.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {item.label}
                      </span>
                      <span className="block text-xs leading-relaxed text-muted">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end border-t border-border/60 p-4">{fab}</div>
          </div>
        ) : (
          <div className="gigasocial-stable pointer-events-auto flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {fab}
          </div>
        )}
      </div>
    </>,
    document.body
  );
});
