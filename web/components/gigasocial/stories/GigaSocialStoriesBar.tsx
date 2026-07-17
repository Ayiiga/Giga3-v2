"use client";

import { GigaSocialStoriesViewer } from "@/components/gigasocial/stories/GigaSocialStoriesViewer";
import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { useGigaSocialStories } from "@/hooks/useGigaSocialStories";
import {
  buildStoryRingItems,
  reelsForStoryRing,
} from "@/lib/gigasocial/storyRings";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

export const GigaSocialStoriesBar = memo(function GigaSocialStoriesBar({
  sessionToken,
  className,
  autoOpen = false,
  autoOpenRingId,
}: {
  sessionToken?: string | null;
  className?: string;
  autoOpen?: boolean;
  autoOpenRingId?: string;
}) {
  const { reels, viewedIds, loading, offline, offlineCachedReels, hasOfflineSnapshot } =
    useGigaSocialStories(sessionToken);
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
      setStartIndex(0);
      setViewerOpen(true);
    },
    [reels]
  );

  useEffect(() => {
    if (!autoOpen || autoOpenedRef.current || loading || !reels.length) return;
    autoOpenedRef.current = true;
    openRing(autoOpenRingId?.trim() || "community");
  }, [autoOpen, autoOpenRingId, loading, openRing, reels.length]);

  if (loading && !reels.length && !offline) {
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

  if (!ringItems.length) {
    if (offline) {
      return (
        <p className={cn("px-2 py-2 text-center text-xs text-muted", className)} role="status">
          {hasOfflineSnapshot
            ? "No cached Stories available offline. Watch Stories while online to save them for replay."
            : "Connect to the internet to load Stories."}
        </p>
      );
    }
    return null;
  }

  return (
    <>
      {offline ? (
        <p className={cn("px-2 pb-1 text-center text-[11px] text-amber-700", className)} role="status">
          Offline mode · {offlineCachedReels.length} cached reel
          {offlineCachedReels.length === 1 ? "" : "s"} available
        </p>
      ) : null}
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
