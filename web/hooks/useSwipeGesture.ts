"use client";

import { useCallback, useRef } from "react";

type SwipeGestureOptions = {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  threshold?: number;
  tapThreshold?: number;
  enabled?: boolean;
  /** Prefer horizontal when absX >= absY (gallery lightbox). */
  preferHorizontal?: boolean;
};

/** Touch swipe detection for feed skip (vertical) and lightbox galleries (horizontal). */
export function useSwipeGesture({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onDoubleTap,
  threshold = 56,
  tapThreshold = 12,
  enabled = true,
  preferHorizontal = false,
}: SwipeGestureOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef(0);

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

      const horizontalDominant = preferHorizontal
        ? absX >= absY
        : absX > absY;

      if (horizontalDominant && absX >= threshold) {
        if (deltaX < 0) onSwipeLeft?.();
        else onSwipeRight?.();
        return;
      }

      if (!horizontalDominant && absY >= threshold) {
        if (deltaY < 0) onSwipeUp?.();
        else onSwipeDown?.();
        return;
      }

      if (absX <= tapThreshold && absY <= tapThreshold) {
        const now = Date.now();
        if (onDoubleTap && now - lastTapRef.current < 280) {
          lastTapRef.current = 0;
          onDoubleTap();
          return;
        }
        lastTapRef.current = now;
        onTap?.();
      }
    },
    [
      enabled,
      onSwipeDown,
      onSwipeUp,
      onSwipeLeft,
      onSwipeRight,
      onTap,
      onDoubleTap,
      preferHorizontal,
      tapThreshold,
      threshold,
    ]
  );

  return { onTouchStart, onTouchEnd };
}
