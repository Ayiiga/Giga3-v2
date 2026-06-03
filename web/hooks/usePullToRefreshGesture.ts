"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const PULL_THRESHOLD = 80;
const MAX_PULL = 112;

interface UsePullToRefreshGestureOptions {
  onRefresh: () => Promise<void> | void;
  scrollRef?: RefObject<HTMLElement | null>;
  disabled?: boolean;
}

export function usePullToRefreshGesture({
  onRefresh,
  scrollRef,
  disabled = false,
}: UsePullToRefreshGestureOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  pullRef.current = pullDistance;
  refreshingRef.current = refreshing;

  const isAtScrollTop = useCallback(() => {
    const el = scrollRef?.current;
    if (el) return el.scrollTop <= 1;
    return typeof window !== "undefined" && window.scrollY <= 1;
  }, [scrollRef]);

  const resetDrag = useCallback(() => {
    isDragging.current = false;
    pullRef.current = 0;
    setPullDistance(0);
  }, []);

  useEffect(() => {
    if (disabled) return;

    const target: HTMLElement | Document = scrollRef?.current ?? document;

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current || !isAtScrollTop()) return;
      if (e.touches.length !== 1) return;
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDragging.current || refreshingRef.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0 && isAtScrollTop()) {
        if (e.cancelable) e.preventDefault();
        const next = Math.min(delta * 0.5, MAX_PULL);
        pullRef.current = next;
        setPullDistance(next);
      } else if (delta <= 0) {
        resetDrag();
      }
    }

    async function onTouchEnd() {
      if (!isDragging.current) return;
      isDragging.current = false;
      const pulled = pullRef.current;
      if (pulled >= PULL_THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        try {
          await onRefresh();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          pullRef.current = 0;
          setPullDistance(0);
        }
      } else {
        resetDrag();
      }
    }

    target.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    target.addEventListener("touchmove", onTouchMove as EventListener, { passive: false });
    target.addEventListener("touchend", onTouchEnd as EventListener);
    target.addEventListener("touchcancel", resetDrag as EventListener);

    return () => {
      target.removeEventListener("touchstart", onTouchStart as EventListener);
      target.removeEventListener("touchmove", onTouchMove as EventListener);
      target.removeEventListener("touchend", onTouchEnd as EventListener);
      target.removeEventListener("touchcancel", resetDrag as EventListener);
    };
  }, [disabled, isAtScrollTop, onRefresh, resetDrag, scrollRef]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return {
    pullDistance,
    refreshing,
    progress,
    ready: pullDistance >= PULL_THRESHOLD,
  };
}
