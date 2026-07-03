"use client";

import {
  GIGA_MODELS,
  getGigaModel,
  isProModelLocked,
  modelsForAccess,
  type GigaModelId,
} from "@/lib/chat/gigaModels";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Lock } from "lucide-react";
import { memo, useEffect, useId, useRef, useState } from "react";

interface ModelSelectorProps {
  value: GigaModelId;
  onChange: (id: GigaModelId) => void;
  hasOpenAiAccess?: boolean;
  freeOpenAiRemaining?: number;
  isPremium?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export const ModelSelector = memo(function ModelSelector({
  value,
  onChange,
  hasOpenAiAccess = false,
  freeOpenAiRemaining = 0,
  isPremium = false,
  disabled,
  compact,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const current = getGigaModel(value);
  const Icon = current.icon;
  const availableModels = modelsForAccess();

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
          "inline-flex max-w-full min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-2 text-sm font-medium text-foreground shadow-sm sm:gap-2 sm:px-3",
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
          {availableModels.map((model) => {
            const ModelIcon = model.icon;
            const selected = model.id === value;
            const locked = isProModelLocked(model.id, hasOpenAiAccess);
            const proHint =
              model.id === "pro" && !isPremium && !locked
                ? `${freeOpenAiRemaining} free today`
                : null;
            return (
              <li key={model.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  disabled={locked}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-accent/5",
                    selected && "bg-accent/5",
                    locked && "cursor-not-allowed opacity-60"
                  )}
                  onClick={() => {
                    if (locked) return;
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
                      {locked && (
                        <Lock className="h-3.5 w-3.5 text-muted" aria-hidden />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">
                      {model.description}
                    </span>
                    <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                      {proHint ?? model.engineLabel}
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
