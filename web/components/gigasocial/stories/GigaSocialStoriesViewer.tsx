"use client";

import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { GigaSocialPostMedia } from "@/components/gigasocial/GigaSocialPostMedia";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import {
  markStoryViewed,
  notifyViewedStoriesChanged,
} from "@/lib/gigasocial/storiesStorage";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEW_MARK_MS = 1800;

interface GigaSocialStoriesViewerProps {
  reels: SocialPost[];
  initialIndex?: number;
  onClose: () => void;
}

export const GigaSocialStoriesViewer = memo(function GigaSocialStoriesViewer({
  reels,
  initialIndex = 0,
  onClose,
}: GigaSocialStoriesViewerProps) {
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(reels.length - 1, 0))
  );
  const [mounted, setMounted] = useState(false);
  const markTimerRef = useRef<number | null>(null);

  const active = reels[index] ?? null;

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(reels.length - 1, current + 1));
  }, [reels.length]);

  const goPrevious = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const swipe = useSwipeGesture({
    enabled: reels.length > 1,
    onSwipeUp: goNext,
    onSwipeDown: goPrevious,
    threshold: 72,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const storyId = active?._id;
    if (!storyId) return;
    if (markTimerRef.current) window.clearTimeout(markTimerRef.current);
    markTimerRef.current = window.setTimeout(() => {
      markStoryViewed(storyId);
      notifyViewedStoriesChanged();
    }, VIEW_MARK_MS);
    return () => {
      if (markTimerRef.current) window.clearTimeout(markTimerRef.current);
    };
  }, [active?._id]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowDown" || event.key === "PageDown") goNext();
      if (event.key === "ArrowUp" || event.key === "PageUp") goPrevious();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrevious, onClose]);

  if (!mounted || !active) return null;

  return createPortal(
    <div
      className="gigasocial-stable fixed inset-0 z-[70] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Stories and reels viewer"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2">
          <SocialAvatar
            name={active.author.displayName}
            avatarUrl={active.author.avatarUrl}
            size="sm"
            hasStory
            hasUnviewedStory={false}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{active.author.displayName}</p>
            <p className="truncate text-xs text-white/70">@{active.author.handle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Close stories viewer"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 flex-col"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <div className="flex justify-center gap-1 px-4 py-2">
          {reels.map((reel, reelIndex) => (
            <span
              key={reel._id}
              className={cn(
                "h-0.5 flex-1 rounded-full transition-colors",
                reelIndex <= index ? "bg-white" : "bg-white/30"
              )}
              aria-hidden
            />
          ))}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="gigasocial-stories-slide relative h-full max-h-[min(78dvh,42rem)] w-full max-w-md overflow-hidden rounded-2xl bg-black">
            <GigaSocialPostMedia
              post={active}
              autoPlay
              paused={false}
              featured
              allowFullView={false}
            />
          </div>
        </div>

        {reels.length > 1 ? (
          <p className="pb-3 text-center text-xs text-white/60" aria-live="polite">
            Swipe up or down · {index + 1} of {reels.length}
          </p>
        ) : null}
      </div>
    </div>,
    document.body
  );
});
