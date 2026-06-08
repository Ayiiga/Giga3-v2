"use client";

import {
  IMAGE_STUDIO_QUICK_ACTIONS,
  buildImageStudioActionUrl,
} from "@/lib/chat/imageStudioLinks";
import { cn } from "@/lib/utils";
import { ImageIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

interface ImageStudioQuickPanelProps {
  className?: string;
  sourceUrl?: string;
}

export const ImageStudioQuickPanel = memo(function ImageStudioQuickPanel({
  className,
  sourceUrl,
}: ImageStudioQuickPanelProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden />
        Image Studio
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Generate or edit images in Media Studio. Results can be shared back into chat as links.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {IMAGE_STUDIO_QUICK_ACTIONS.map((action) => (
          <Link
            key={action.id}
            href={buildImageStudioActionUrl(action.id, sourceUrl)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-2 py-2 text-center",
              "text-xs font-medium text-foreground shadow-sm hover:border-accent/25 hover:bg-accent/5"
            )}
          >
            <ImageIcon className="h-4 w-4 text-accent" aria-hidden />
            <span className="leading-tight">{action.shortLabel}</span>
          </Link>
        ))}
      </div>
    </div>
  );
});
