"use client";

import { buildCreatorTemplateUrl, CREATOR_TEMPLATES } from "@/lib/creator-studio/creatorTemplates";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { memo } from "react";

/** Inline template shortcuts for GigaSocial compose — links to Creator Studio presets. */
export const CreatorTemplateQuickPick = memo(function CreatorTemplateQuickPick({
  className,
}: {
  className?: string;
}) {
  const featured = CREATOR_TEMPLATES.slice(0, 8);

  return (
    <div className={cn("rounded-xl border border-border bg-muted/10 p-3", className)}>
      <p className="text-xs font-semibold text-foreground">Premium templates</p>
      <p className="mt-0.5 text-[11px] text-muted">
        Photo, video, reels, stories, and music layouts — original uploads stay intact.
      </p>
      <div className="mt-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
        {featured.map((template) => (
          <Link
            key={template.id}
            href={buildCreatorTemplateUrl(template)}
            className="inline-flex min-h-16 w-28 shrink-0 flex-col justify-between rounded-xl border border-border bg-white px-2.5 py-2 text-left hover:border-accent/30 hover:bg-accent/5"
          >
            <span className="line-clamp-2 text-xs font-medium text-foreground">{template.title}</span>
            <span className="text-[10px] text-muted">{template.aspectRatio}</span>
          </Link>
        ))}
      </div>
      <Link href="/creator-studio/" className="mt-2 inline-block text-xs font-medium text-accent hover:underline">
        Browse all templates
      </Link>
    </div>
  );
});
