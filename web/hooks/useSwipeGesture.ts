"use client";

import { useCallback, useRef } from "react";

type SwipeGestureOptions = {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  enabled?: boolean;
};

/** Vertical swipe detection for short-video skip UX (touch only). */
export function useSwipeGesture({
  onSwipeUp,
  onSwipeDown,
  threshold = 56,
  enabled = true,
}: SwipeGestureOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled) return;
      const touch = event.touches[0];
      if (!touch) return;
      startRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [enabled]
  );

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled || !startRef.current) return;
      const touch = event.changedTouches[0];
      if (!touch) {
        startRef.current = null;
        return;
      }

      const deltaX = touch.clientX - startRef.current.x;
      const deltaY = touch.clientY - startRef.current.y;
      startRef.current = null;

      if (Math.abs(deltaY) < threshold) return;
      if (Math.abs(deltaX) > Math.abs(deltaY)) return;

      if (deltaY < 0) onSwipeUp?.();
      else onSwipeDown?.();
    },
    [enabled, onSwipeDown, onSwipeUp, threshold]
  );

  return { onTouchStart, onTouchEnd };
}
