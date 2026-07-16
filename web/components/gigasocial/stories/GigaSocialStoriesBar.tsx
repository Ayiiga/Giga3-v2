"use client";

import { GigaSocialStoriesViewer } from "@/components/gigasocial/stories/GigaSocialStoriesViewer";
import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { useGigaSocialStories } from "@/hooks/useGigaSocialStories";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

type StoryRingItem = {
  id: string;
  label: string;
  avatarUrl?: string | null;
  hasUnviewed: boolean;
  reelIndex: number;
};

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
  const [startIndex, setStartIndex] = useState(0);
  const autoOpenedRef = useRef(false);

  const ringItems = useMemo((): StoryRingItem[] => {
    if (!reels.length) return [];

    const byAuthor = new Map<string, { post: SocialPost; index: number }>();
    reels.forEach((post, index) => {
      const key = post.author.handle || post.author.displayName;
      if (!byAuthor.has(key)) byAuthor.set(key, { post, index });
    });

    const community: StoryRingItem = {
      id: "community",
      label: "Community",
      avatarUrl: reels[0]?.author.avatarUrl,
      hasUnviewed: reels.some((post) => !viewedIds.has(post._id)),
      reelIndex: 0,
    };

    const creators = [...byAuthor.values()].slice(0, 3).map(({ post, index }) => ({
      id: post._id,
      label: post.author.displayName,
      avatarUrl: post.author.avatarUrl,
      hasUnviewed: !viewedIds.has(post._id),
      reelIndex: index,
    }));

    return [community, ...creators];
  }, [reels, viewedIds]);

  const openViewer = useCallback((reelIndex: number) => {
    setStartIndex(reelIndex);
    setViewerOpen(true);
  }, []);

  useEffect(() => {
    if (!autoOpen || autoOpenedRef.current || loading || !reels.length) return;
    autoOpenedRef.current = true;
    openViewer(0);
  }, [autoOpen, loading, openViewer, reels.length]);

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
            onClick={() => openViewer(item.reelIndex)}
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

      {viewerOpen ? (
        <GigaSocialStoriesViewer
          reels={reels}
          initialIndex={startIndex}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </>
  );
});
