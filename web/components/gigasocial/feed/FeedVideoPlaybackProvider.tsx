"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const MIN_PLAY_RATIO = 0.55;

type FeedVideoPlaybackContextValue = {
  activePostId: string | null;
  observeVideo: (postId: string, element: HTMLElement | null) => void;
  isActiveVideo: (postId: string) => boolean;
};

const FeedVideoPlaybackContext = createContext<FeedVideoPlaybackContextValue | null>(
  null
);

/** Ensures only one feed video autoplays — the most visible clip wins. */
export function FeedVideoPlaybackProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const entriesRef = useRef<Map<string, HTMLElement>>(new Map());
  const ratiosRef = useRef<Map<string, number>>(new Map());
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const pickActiveVideo = useCallback(() => {
    let bestId: string | null = null;
    let bestRatio = MIN_PLAY_RATIO;
    for (const [postId, ratio] of ratiosRef.current) {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestId = postId;
      }
    }
    setActivePostId((current) => (current === bestId ? current : bestId));
  }, []);

  useEffect(() => {
    if (!enabled) {
      ratiosRef.current.clear();
      setActivePostId(null);
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const postId = entry.target.getAttribute("data-feed-video-id");
          if (!postId) continue;
          ratiosRef.current.set(
            postId,
            entry.isIntersecting ? entry.intersectionRatio : 0
          );
        }
        pickActiveVideo();
      },
      { threshold: [0, 0.25, 0.5, 0.6, 0.75, 1] }
    );

    observerRef.current = observer;
    for (const element of entriesRef.current.values()) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [enabled, pickActiveVideo]);

  useEffect(() => {
    if (!enabled) return;
    for (const [postId, element] of entriesRef.current) {
      if (postId === activePostId) continue;
      const video = element.querySelector("video");
      if (video && !video.paused) video.pause();
    }
  }, [activePostId, enabled]);

  const observeVideo = useCallback((postId: string, element: HTMLElement | null) => {
    const observer = observerRef.current;
    const previous = entriesRef.current.get(postId);
    if (previous && observer) observer.unobserve(previous);

    if (!element) {
      entriesRef.current.delete(postId);
      ratiosRef.current.delete(postId);
      pickActiveVideo();
      return;
    }

    element.dataset.feedVideoId = postId;
    entriesRef.current.set(postId, element);
    ratiosRef.current.set(postId, 0);
    if (observer) observer.observe(element);
  }, [pickActiveVideo]);

  const isActiveVideo = useCallback(
    (postId: string) => activePostId === postId,
    [activePostId]
  );

  const value = useMemo(
    () => ({ activePostId, observeVideo, isActiveVideo }),
    [activePostId, observeVideo, isActiveVideo]
  );

  return (
    <FeedVideoPlaybackContext.Provider value={value}>
      {children}
    </FeedVideoPlaybackContext.Provider>
  );
}

export function useFeedVideoPlayback(): FeedVideoPlaybackContextValue {
  const context = useContext(FeedVideoPlaybackContext);
  if (!context) {
    return {
      activePostId: null,
      observeVideo: () => undefined,
      isActiveVideo: () => false,
    };
  }
  return context;
}
