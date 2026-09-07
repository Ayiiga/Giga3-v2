"use client";

import { LayoutTemplate } from "lucide-react";
import { memo } from "react";

export const GigaTemplateButton = memo(function GigaTemplateButton({
  disabled,
  onUseTemplate,
}: {
  disabled?: boolean;
  onUseTemplate: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onUseTemplate}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted hover:bg-accent/5 hover:text-accent disabled:opacity-50"
      aria-label="Use as template"
    >
      <LayoutTemplate className="h-4 w-4" aria-hidden />
      Use as Template
    </button>
  );
});
