"use client";

import { cn } from "@/lib/utils";
import {
  formatAccessTime,
  type LiveWebSource,
} from "@/lib/chat/liveWebTypes";
import { ChevronDown, ExternalLink } from "lucide-react";
import { memo, useId, useState } from "react";

const SOURCE_SUMMARY_TITLE = "Web research summary";

function isSummaryCard(source: LiveWebSource): boolean {
  return source.title === SOURCE_SUMMARY_TITLE;
}

interface LiveWebSourceCardsProps {
  sources: LiveWebSource[];
}

/** Compact sources control — one “Sources” button; expand to read more. */
export const LiveWebSourceCards = memo(function LiveWebSourceCards({
  sources,
}: LiveWebSourceCardsProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  const compactSummary =
    sources.length === 1 && sources[0] && isSummaryCard(sources[0]);
  const label = compactSummary
    ? "Reference"
    : `Sources · ${sources.length}`;

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-sm",
          "hover:border-accent/30 hover:bg-accent/5",
          open && "border-accent/40 bg-accent/5"
        )}
      >
        <span className="min-w-0 truncate">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {compactSummary ? "Reference" : "Sources"}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
            {compactSummary ? "Read more" : `${sources.length} source${sources.length === 1 ? "" : "s"} · Read more`}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
        <span className="sr-only">{open ? `Hide ${label}` : `Show ${label}`}</span>
      </button>

      {open ? (
        <ul id={listId} className="mt-2 space-y-2">
          {sources.map((source) => {
            const summary = isSummaryCard(source);
            return (
              <li
                key={source.uri}
                className={cn(
                  "rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-sm",
                  summary && "border-dashed"
                )}
              >
                {summary ? (
                  source.excerpt ? (
                    <p className="text-xs leading-relaxed text-muted">{source.excerpt}</p>
                  ) : null
                ) : (
                  <>
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
                    {source.publishedAt ? (
                      <p className="mt-1 text-[11px] text-muted/80">
                        Published {source.publishedAt}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted/80">
                      Accessed {formatAccessTime(source.accessedAt)}
                    </p>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
});
