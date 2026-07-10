"use client";

import {
  GIGA_CREATE_MENU,
  type GigaCreateActionId,
} from "@/components/gigasocial/create/gigaCreateMenu";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export type GigaCreateLaunch = {
  action: GigaCreateActionId;
};

export const GigaCreateButton = memo(function GigaCreateButton({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (launch: GigaCreateLaunch) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [close, open]);

  return (
    <div ref={rootRef} className="gigasocial-create-fab pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {open ? (
          <div
            className="gigasocial-create-menu w-[min(100vw-2rem,20rem)] rounded-2xl border border-white/40 bg-white/90 p-2 shadow-lg"
            role="menu"
            aria-label="GigaCreate options"
          >
            {GIGA_CREATE_MENU.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent/5"
                onClick={() => {
                  onSelect({ action: item.id });
                  close();
                }}
              >
                <span className="text-lg" aria-hidden>
                  {item.emoji}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted">{item.description}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "gigasocial-create-fab-button inline-flex h-14 w-14 items-center justify-center rounded-full border border-violet-300/50 bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg",
            open && "rotate-45",
            disabled && "opacity-50"
          )}
          aria-label={open ? "Close GigaCreate" : "Open GigaCreate"}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Plus className="h-6 w-6" aria-hidden />}
        </button>
      </div>
    </div>
  );
});
