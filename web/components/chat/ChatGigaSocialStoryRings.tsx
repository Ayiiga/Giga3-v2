"use client";

import { GigaSocialStoriesViewer } from "@/components/gigasocial/stories/GigaSocialStoriesViewer";
import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { useGigaSocialStories } from "@/hooks/useGigaSocialStories";
import {
  buildStoryRingItems,
  reelsForStoryRing,
} from "@/lib/gigasocial/storyRings";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { memo, useCallback, useMemo, useState } from "react";

type ChatGigaSocialStoryRingsProps = {
  className?: string;
  /** Compact header layout — hides labels under rings */
  compact?: boolean;
};

/**
 * Interactive GigaSocial story rings for chat chrome.
 * Opens the stories viewer in-place; green dot only when unseen reels exist.
 */
export const ChatGigaSocialStoryRings = memo(function ChatGigaSocialStoryRings({
  className,
  compact = true,
}: ChatGigaSocialStoryRingsProps) {
  const { reels, viewedIds, hasUnviewed, loading } = useGigaSocialStories();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerReels, setViewerReels] = useState(reels);
  const [startIndex, setStartIndex] = useState(0);

  const ringItems = useMemo(
    () => buildStoryRingItems(reels, viewedIds),
    [reels, viewedIds]
  );

  const openRing = useCallback(
    (ringId: string) => {
      const subset = reelsForStoryRing(reels, ringId);
      setViewerReels(subset.length ? subset : reels);
      setStartIndex(0);
      setViewerOpen(true);
    },
    [reels]
  );

  if (loading && !reels.length) {
    return (
      <div
        className={cn("flex items-center gap-1.5", className)}
        aria-hidden
      >
        <span className="h-9 w-9 rounded-full bg-muted/20 sm:h-10 sm:w-10" />
      </div>
    );
  }

  if (!ringItems.length) {
    return (
      <Link
        href={siteConfig.links.gigasocial}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-violet-300 sm:h-10 sm:w-10",
          className
        )}
        aria-label="Open GigaSocial community feed"
        title="GigaSocial"
      >
        <span className="text-xs font-bold" aria-hidden>
          G
        </span>
      </Link>
    );
  }

  return (
    <>
      <div
        className={cn(
          "chat-story-rings flex max-w-[9.5rem] items-center gap-1.5 overflow-x-auto overscroll-x-contain sm:max-w-[11rem]",
          className
        )}
        role="list"
        aria-label="GigaSocial stories"
      >
        {ringItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            className={cn(
              "flex shrink-0 flex-col items-center",
              compact ? "w-10 sm:w-11" : "w-14"
            )}
            onClick={() => openRing(item.id)}
            aria-label={`${item.label} stories${item.hasUnviewed ? ", new content" : ""}`}
            title={item.label}
          >
            <SocialAvatar
              name={item.label}
              avatarUrl={item.avatarUrl}
              size={compact ? "md" : "lg"}
              hasStory
              hasUnviewedStory={item.hasUnviewed}
            />
            {!compact ? (
              <span className="mt-0.5 w-full truncate text-[10px] font-medium text-foreground">
                {item.label}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {hasUnviewed ? (
        <span className="sr-only">New GigaSocial stories available</span>
      ) : null}

      {viewerOpen && viewerReels.length ? (
        <GigaSocialStoriesViewer
          reels={viewerReels}
          initialIndex={Math.min(startIndex, viewerReels.length - 1)}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </>
  );
});
