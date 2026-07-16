"use client";

import { GigaSocialStoriesViewer } from "@/components/gigasocial/stories/GigaSocialStoriesViewer";
import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { useGigaSocialStories } from "@/hooks/useGigaSocialStories";
import {
  buildStoryRingItems,
  reelsForStoryRing,
  storyRingStartIndex,
} from "@/lib/gigasocial/storyRings";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

export const GigaSocialStoriesBar = memo(function GigaSocialStoriesBar({
  sessionToken,
  className,
  autoOpen = false,
}: {
  sessionToken?: string | null;
  className?: string;
  autoOpen?: boolean;
}) {
  const { reels, viewedIds, loading } = useGigaSocialStories(sessionToken);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerReels, setViewerReels] = useState<SocialPost[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const autoOpenedRef = useRef(false);

  const ringItems = useMemo(
    () => buildStoryRingItems(reels, viewedIds),
    [reels, viewedIds]
  );

  const openRing = useCallback(
    (ringId: string) => {
      const subset = reelsForStoryRing(reels, ringId);
      setViewerReels(subset.length ? subset : reels);
      setStartIndex(storyRingStartIndex(reels, ringId));
      setViewerOpen(true);
    },
    [reels]
  );

  useEffect(() => {
    if (!autoOpen || autoOpenedRef.current || loading || !reels.length) return;
    autoOpenedRef.current = true;
    openRing("community");
  }, [autoOpen, loading, openRing, reels.length]);

  if (loading && !reels.length) {
    return (
      <div
        className={cn("gigasocial-stories-bar flex gap-3 overflow-x-auto px-1 py-1", className)}
        aria-hidden
      >
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="flex w-16 shrink-0 flex-col items-center gap-1">
            <div className="h-14 w-14 rounded-full bg-muted/20" />
            <div className="h-2 w-10 rounded bg-muted/20" />
          </div>
        ))}
      </div>
    );
  }

  if (!ringItems.length) return null;

  return (
    <>
      <div
        className={cn(
          "gigasocial-stories-bar flex gap-3 overflow-x-auto overscroll-x-contain px-1 py-1",
          className
        )}
        role="list"
        aria-label="Stories and reels"
      >
        {ringItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            className="flex w-16 shrink-0 flex-col items-center gap-1 text-center"
            onClick={() => openRing(item.id)}
            aria-label={`${item.label}${item.hasUnviewed ? ", new content" : ""}`}
          >
            <SocialAvatar
              name={item.label}
              avatarUrl={item.avatarUrl}
              size="lg"
              hasStory
              hasUnviewedStory={item.hasUnviewed}
            />
            <span className="w-full truncate text-[11px] font-medium text-foreground">
              {item.label}
            </span>
          </button>
        ))}
      </div>

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
