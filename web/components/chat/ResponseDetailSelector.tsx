"use client";

import {
  RESPONSE_DETAIL_OPTIONS,
  type ResponseDetailId,
} from "@/lib/chat/responseDetail";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface ResponseDetailSelectorProps {
  value: ResponseDetailId | null;
  onChange: (id: ResponseDetailId | null) => void;
  disabled?: boolean;
  className?: string;
}

export const ResponseDetailSelector = memo(function ResponseDetailSelector({
  value,
  onChange,
  disabled,
  className,
}: ResponseDetailSelectorProps) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 rounded-xl border border-border bg-card p-0.5 text-xs shadow-sm",
        className
      )}
      role="group"
      aria-label="Answer detail"
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={value === null}
        title="Auto — match the question"
        onClick={() => onChange(null)}
        className={cn(
          "min-h-8 rounded-lg px-2 font-medium text-muted hover:text-foreground",
          value === null && "bg-accent/10 text-foreground"
        )}
      >
        Auto
      </button>
      {RESPONSE_DETAIL_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          aria-pressed={value === opt.id}
          title={opt.description}
          onClick={() => onChange(opt.id)}
          className={cn(
            "min-h-8 rounded-lg px-2 font-medium text-muted hover:text-foreground",
            value === opt.id && "bg-accent/10 text-foreground"
          )}
        >
          {opt.shortLabel}
        </button>
      ))}
    </div>
  );
});
