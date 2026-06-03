"use client";

import {
  DOCUMENT_TEMPLATES,
  type DocumentTemplateId,
} from "@/lib/chat/documentTemplates";
import { resolveTemplatePlaceholders } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, LayoutTemplate } from "lucide-react";
import { useState } from "react";

interface DocumentTemplatePickerProps {
  disabled?: boolean;
  onInsert: (text: string) => void;
  onError: (message: string) => void;
  compact?: boolean;
}

export function DocumentTemplatePicker({
  disabled,
  onInsert,
  onError,
  compact = false,
}: DocumentTemplatePickerProps) {
  const [open, setOpen] = useState(!compact);

  function insertTemplate(id: DocumentTemplateId) {
    try {
      const template = DOCUMENT_TEMPLATES.find((t) => t.id === id);
      if (!template) {
        onError("Template not found.");
        return;
      }
      onInsert(resolveTemplatePlaceholders(template.body));
    } catch {
      onError("Could not load template. Please try again.");
    }
  }

  return (
    <div className={cn("border-border", compact ? "" : "border-b bg-black/20 px-3 py-3 sm:px-4")}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-12 items-center justify-between gap-2 rounded-xl px-1 text-left text-sm font-semibold text-foreground hover:text-accent disabled:opacity-50"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-accent" aria-hidden />
          Professional templates
        </span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted" aria-hidden />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted" aria-hidden />
        )}
      </button>

      {open && (
        <div
          className={cn(
            "mt-3 grid gap-2",
            compact
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          )}
        >
          {DOCUMENT_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                type="button"
                disabled={disabled}
                onClick={() => insertTemplate(template.id)}
                className={cn(
                  "flex min-h-[4.5rem] items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all",
                  "hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  disabled && "pointer-events-none opacity-50"
                )}
              >
                <Icon className="mt-0.5 h-6 w-6 shrink-0 text-accent" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {template.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">
                    {template.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!compact && open && (
        <p className="mt-2 text-xs text-muted">
          Templates insert editable text with today&apos;s date — refine in the message box before sending.
        </p>
      )}
    </div>
  );
}
