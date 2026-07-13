"use client";

import { cn } from "@/lib/utils";
import {
  CREATOR_TEMPLATES,
  type CreatorTemplate,
  buildCreatorTemplateUrl,
} from "@/lib/creator-studio/creatorTemplates";
import { useRouter } from "next/navigation";
import { memo } from "react";

interface CreatorTemplatePickerProps {
  onSelectWriting?: (template: CreatorTemplate) => void;
  className?: string;
}

export const CreatorTemplatePicker = memo(function CreatorTemplatePicker({
  onSelectWriting,
  className,
}: CreatorTemplatePickerProps) {
  const router = useRouter();

  function handleSelect(template: CreatorTemplate) {
    if (template.tab === "writing" || template.tab === "social") {
      onSelectWriting?.(template);
      return;
    }
    router.push(buildCreatorTemplateUrl(template));
  }

  return (
    <section
      className={cn("space-y-4", className)}
      aria-labelledby="creator-templates-heading"
    >
      <div>
        <h2 id="creator-templates-heading" className="text-lg font-semibold">
          Creator templates
        </h2>
        <p className="text-sm text-muted">
          Reusable layouts with transitions, typography, and correct aspect ratios.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CREATOR_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template)}
              id={`creator-template-${template.id}`}
              className="saas-card flex min-h-[88px] flex-col items-start gap-2 rounded-2xl border border-border p-4 text-left transition-colors hover:border-accent/40 hover:bg-accent/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label={`${template.title}: ${template.description}`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 text-accent" aria-hidden />
                {template.title}
              </span>
              <span className="text-xs text-muted">{template.description}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted">
                {template.aspectRatio} · {template.transitions}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});
