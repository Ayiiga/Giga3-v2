"use client";

import { useCallback, useRef } from "react";

type SwipeGestureOptions = {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  threshold?: number;
  tapThreshold?: number;
  enabled?: boolean;
};

/** Vertical swipe detection for short-video skip UX (touch only). */
export function useSwipeGesture({
  onSwipeUp,
  onSwipeDown,
  onTap,
  threshold = 56,
  tapThreshold = 12,
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

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absY >= threshold && absX <= absY) {
        if (deltaY < 0) onSwipeUp?.();
        else onSwipeDown?.();
        return;
      }

      if (onTap && absX <= tapThreshold && absY <= tapThreshold) {
        onTap();
      }
    },
    [enabled, onSwipeDown, onSwipeUp, onTap, tapThreshold, threshold]
  );

  return { onTouchStart, onTouchEnd };
}
