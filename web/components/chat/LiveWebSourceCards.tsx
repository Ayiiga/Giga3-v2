"use client";

import { cn } from "@/lib/utils";
import {
  formatAccessTime,
  type LiveWebSource,
} from "@/lib/chat/liveWebTypes";
import { ExternalLink } from "lucide-react";
import { memo } from "react";

interface LiveWebSourceCardsProps {
  sources: LiveWebSource[];
}

export const LiveWebSourceCards = memo(function LiveWebSourceCards({
  sources,
}: LiveWebSourceCardsProps) {
  if (!sources.length) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Sources
      </p>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li
            key={source.uri}
            className="rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{source.title}</p>
                <p className="text-xs text-muted">{source.domain}</p>
              </div>
              <a
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs",
                  "text-accent hover:bg-accent/10"
                )}
              >
                Open
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </div>
            {source.excerpt ? (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">
                {source.excerpt}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-muted/80">
              Accessed {formatAccessTime(source.accessedAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
});
