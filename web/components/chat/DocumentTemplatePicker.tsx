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
  embedded?: boolean;
  defaultOpen?: boolean;
}

export function DocumentTemplatePicker({
  disabled,
  onInsert,
  onError,
  compact = false,
  embedded = false,
  defaultOpen,
}: DocumentTemplatePickerProps) {
  const initialOpen = defaultOpen ?? !compact;
  const [open, setOpen] = useState(initialOpen);

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
    <div
      className={cn(
        embedded ? "px-3 py-3 sm:px-4" : "border-b border-border bg-zinc-50 px-3 py-3 sm:px-4",
        !embedded && "border-border"
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-11 items-center justify-between gap-2 rounded-xl px-1 text-left text-base font-medium text-foreground hover:text-accent disabled:opacity-50"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <LayoutTemplate className="h-6 w-6 text-accent" aria-hidden />
          Document templates
        </span>
        {open ? (
          <ChevronUp className="h-6 w-6 text-muted" aria-hidden />
        ) : (
          <ChevronDown className="h-6 w-6 text-muted" aria-hidden />
        )}
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                type="button"
                disabled={disabled}
                onClick={() => insertTemplate(template.id)}
                className={cn(
                  "saas-card group flex min-h-[5.5rem] items-start gap-3 p-4 text-left",
                  "hover:border-accent/25 hover:bg-accent/5",
                  disabled && "pointer-events-none opacity-50"
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/20 shadow-inner">
                  <Icon className="h-6 w-6 text-violet-300" aria-hidden />
                </div>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-foreground">
                    {template.title}
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-muted">
                    {template.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <p className="mt-3 text-sm text-muted">
          Templates insert editable text with today&apos;s date — refine in the message box before
          sending.
        </p>
      )}
    </div>
  );
}
