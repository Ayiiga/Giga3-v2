"use client";

import {
  buildMediaStudioUrl,
  getMediaStudioTemplate,
  MEDIA_STUDIO_TEMPLATES,
} from "@/lib/media/studioTemplates";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback } from "react";

interface MediaQuickTemplatesProps {
  onApply: (template: {
    tab: "image" | "video";
    category: string;
    prompt: string;
  }) => void;
}

export const MediaQuickTemplates = memo(function MediaQuickTemplates({
  onApply,
}: MediaQuickTemplatesProps) {
  const router = useRouter();
  const params = useSearchParams();
  const activeTemplate = params.get("template");

  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = getMediaStudioTemplate(templateId);
      if (!template) return;
      onApply({
        tab: template.tab,
        category: template.category,
        prompt: template.prompt,
      });
      try {
        router.replace(buildMediaStudioUrl(template), { scroll: false });
      } catch {
        /* optional */
      }
    },
    [onApply, router]
  );

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground sm:text-xl">Quick templates</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MEDIA_STUDIO_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template.id)}
              className={cn(
                "saas-card flex min-h-[5rem] items-center gap-3 p-4 text-left",
                activeTemplate === template.id && "ring-2 ring-violet-500/50"
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                  template.gradient
                )}
              >
                <Icon className="h-6 w-6 text-white" aria-hidden />
              </div>
              <span>
                <span className="block text-base font-semibold">{template.title}</span>
                <span className="text-sm text-muted">{template.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});
