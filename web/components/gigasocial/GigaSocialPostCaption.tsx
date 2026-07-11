"use client";

import {
  extractHashtagsFromText,
  formatCompactHashtags,
  stripHashtagsFromText,
} from "@/lib/gigasocial/hashtags";
import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";

export const GigaSocialPostCaption = memo(function GigaSocialPostCaption({
  description,
  hashtags,
  className,
}: {
  description: string;
  hashtags?: string[];
  className?: string;
}) {
  const captionText = useMemo(() => stripHashtagsFromText(description), [description]);
  const hashtagLine = useMemo(() => {
    const tags = hashtags?.length ? hashtags : extractHashtagsFromText(description);
    return formatCompactHashtags(tags);
  }, [description, hashtags]);

  if (!captionText && !hashtagLine) return null;

  return (
    <div className={cn("gigasocial-post-caption", className)}>
      {captionText ? (
        <p className="gigasocial-post-description whitespace-pre-wrap">{captionText}</p>
      ) : null}
      {hashtagLine ? (
        <p
          className="gigasocial-post-hashtags mt-1 line-clamp-2 text-[11px] leading-snug text-muted"
          aria-label="Post hashtags"
        >
          {hashtagLine}
        </p>
      ) : null}
    </div>
  );
});
