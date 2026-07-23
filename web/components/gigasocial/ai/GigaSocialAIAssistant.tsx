"use client";

import {
  detectContentCategory,
  improveCaption,
  suggestHashtags,
} from "@/lib/gigasocial/aiAssistant";
import { formatCompactHashtags } from "@/lib/gigasocial/hashtags";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";
import { Sparkles, Wand2 } from "lucide-react";
import { memo, useMemo, useState } from "react";

export const GigaSocialAIAssistant = memo(function GigaSocialAIAssistant({
  body,
  postType,
  onApplyCaption,
  onApplyHashtags,
  onApplyCategory,
  compact = false,
}: {
  body: string;
  postType: SocialPostTypeId;
  onApplyCaption: (next: string) => void;
  onApplyHashtags: (tags: string[]) => void;
  onApplyCategory: (postType: SocialPostTypeId) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => suggestHashtags(body, postType), [body, postType]);
  const detected = useMemo(() => detectContentCategory(body), [body]);
  const hasBody = Boolean(body.trim());

  if (compact) {
    return (
      <div className="rounded-lg border border-border/70 bg-muted/10">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-9 w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs font-medium text-foreground"
          aria-expanded={open}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          AI assist
          <span className="font-normal text-muted">
            {hasBody ? "· Improve · Tags" : "· optional"}
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-muted">
            {open ? "Hide" : "Show"}
          </span>
        </button>
        {open ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-2.5 py-2">
            <button
              type="button"
              disabled={!hasBody}
              onClick={() => onApplyCaption(improveCaption(body))}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border bg-white px-2 text-[11px] font-medium disabled:opacity-40"
            >
              <Wand2 className="h-3 w-3" aria-hidden />
              Improve
            </button>
            <button
              type="button"
              disabled={!hasBody}
              onClick={() => onApplyHashtags(suggestions)}
              className="inline-flex min-h-8 items-center rounded-lg border border-border bg-white px-2 text-[11px] font-medium disabled:opacity-40"
            >
              Hashtags
            </button>
            {hasBody && detected !== postType ? (
              <button
                type="button"
                onClick={() => onApplyCategory(detected)}
                className="inline-flex min-h-8 items-center rounded-lg border border-border bg-white px-2 text-[11px] font-medium capitalize"
              >
                Use {detected}
              </button>
            ) : null}
            {hasBody && suggestions.length > 0 ? (
              <span className="w-full truncate text-[10px] text-muted">
                {formatCompactHashtags(suggestions, 4)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (!hasBody) {
    return (
      <p className="rounded-xl border border-dashed border-accent/20 bg-accent/5 px-3 py-2 text-xs text-muted">
        Start typing or add media — AI suggestions will appear here (optional).
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-accent/15 bg-violet-50/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden />
        AI creation assistant
        <span className="text-xs font-normal text-muted">(optional)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border bg-white px-3 text-xs font-medium"
          onClick={() => onApplyCaption(improveCaption(body))}
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          Improve caption
        </button>
        <button
          type="button"
          className="inline-flex min-h-9 items-center rounded-lg border border-border bg-white px-3 text-xs font-medium"
          onClick={() => onApplyHashtags(suggestions)}
        >
          Suggest hashtags
        </button>
        {detected !== postType ? (
          <button
            type="button"
            className="inline-flex min-h-9 items-center rounded-lg border border-border bg-white px-3 text-xs font-medium capitalize"
            onClick={() => onApplyCategory(detected)}
          >
            Use {detected} category
          </button>
        ) : null}
      </div>
      {suggestions.length > 0 ? (
        <p className="mt-2 truncate text-[11px] text-muted">
          Suggested: {formatCompactHashtags(suggestions, 5)}
        </p>
      ) : null}
    </div>
  );
});
