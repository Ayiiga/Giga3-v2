"use client";

import { Button } from "@/components/ui/Button";
import {
  detectContentCategory,
  improveCaption,
  suggestHashtags,
} from "@/lib/gigasocial/aiAssistant";
import { formatCompactHashtags } from "@/lib/gigasocial/hashtags";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";
import { Sparkles, Wand2 } from "lucide-react";
import { memo, useMemo } from "react";

export const GigaSocialAIAssistant = memo(function GigaSocialAIAssistant({
  body,
  postType,
  onApplyCaption,
  onApplyHashtags,
  onApplyCategory,
}: {
  body: string;
  postType: SocialPostTypeId;
  onApplyCaption: (next: string) => void;
  onApplyHashtags: (tags: string[]) => void;
  onApplyCategory: (postType: SocialPostTypeId) => void;
}) {
  const suggestions = useMemo(() => suggestHashtags(body, postType), [body, postType]);
  const detected = useMemo(() => detectContentCategory(body), [body]);

  if (!body.trim()) {
    return (
      <p className="rounded-xl border border-dashed border-accent/20 bg-accent/5 px-3 py-2 text-xs text-muted">
        Start typing or add media — AI suggestions will appear here (optional).
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-accent/15 bg-gradient-to-br from-violet-50/80 to-indigo-50/50 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden />
        AI creation assistant
        <span className="text-xs font-normal text-muted">(optional)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-9 text-xs"
          onClick={() => onApplyCaption(improveCaption(body))}
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          Improve caption
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-9 text-xs"
          onClick={() => onApplyHashtags(suggestions)}
        >
          Suggest hashtags
        </Button>
        {detected !== postType ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-9 text-xs capitalize"
            onClick={() => onApplyCategory(detected)}
          >
            Use {detected} category
          </Button>
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
