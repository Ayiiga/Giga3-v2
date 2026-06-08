"use client";

import {
  GIGA_MODELS,
  getGigaModel,
  type GigaModelId,
} from "@/lib/chat/gigaModels";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { memo, useEffect, useId, useRef, useState } from "react";

interface ModelSelectorProps {
  value: GigaModelId;
  onChange: (id: GigaModelId) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export const ModelSelector = memo(function ModelSelector({
  value,
  onChange,
  disabled,
  compact,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const current = getGigaModel(value);
  const Icon = current.icon;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm",
          "hover:border-accent/30 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          compact && "min-h-9 px-2.5",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        <span className="truncate">{compact ? current.shortLabel : current.label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </button>

      {open && (
        <ul
          id={menuId}
          role="listbox"
          aria-label="Giga3 model"
          className="absolute bottom-full left-0 z-30 mb-2 w-[min(100vw-2rem,18rem)] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {GIGA_MODELS.map((model) => {
            const ModelIcon = model.icon;
            const selected = model.id === value;
            return (
              <li key={model.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-accent/5",
                    selected && "bg-accent/5"
                  )}
                  onClick={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                >
                  <ModelIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {model.label}
                      {selected && (
                        <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">
                      {model.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
