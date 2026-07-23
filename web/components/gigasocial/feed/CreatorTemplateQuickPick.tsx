"use client";

import { buildCreatorTemplateUrl, CREATOR_TEMPLATES } from "@/lib/creator-studio/creatorTemplates";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { memo, useState } from "react";

/** Inline template shortcuts for GigaSocial compose — links to Creator Studio presets. */
export const CreatorTemplateQuickPick = memo(function CreatorTemplateQuickPick({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const featured = CREATOR_TEMPLATES.slice(0, compact ? 6 : 8);
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <div className={cn("rounded-lg border border-border/70", className)}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-9 w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs font-medium text-foreground"
          aria-expanded={open}
        >
          <span>Templates</span>
          <span className="text-[10px] uppercase tracking-wide text-muted">
            {open ? "Hide" : "Browse"}
          </span>
        </button>
        {open ? (
          <div className="border-t border-border/60 px-2 pb-2 pt-1.5">
            <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain">
              {featured.map((template) => (
                <Link
                  key={template.id}
                  href={buildCreatorTemplateUrl(template)}
                  className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border bg-white px-2.5 text-[11px] font-medium text-foreground hover:border-accent/30"
                >
                  {template.title}
                </Link>
              ))}
              <Link
                href="/creator-studio/"
                className="inline-flex h-9 shrink-0 items-center px-2 text-[11px] font-medium text-accent"
              >
                All →
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

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
