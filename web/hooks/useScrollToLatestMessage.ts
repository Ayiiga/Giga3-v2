"use client";

import { useEffect, useRef, type RefObject } from "react";

interface UseScrollToLatestMessageOptions {
  scrollRef: RefObject<HTMLElement | null>;
  /** Changes when a new user/assistant turn should pin scroll to bottom. */
  scrollKey: string | undefined;
  enabled?: boolean;
  /** Skip auto-scroll when user is reading older messages (px from bottom). */
  nearBottomThresholdPx?: number;
}

function scrollToBottom(el: HTMLElement) {
  const target = el.scrollHeight - el.clientHeight;
  if (Math.abs(el.scrollTop - target) <= 2) return;
  el.scrollTop = target;
}

/**
 * Scrolls once when scrollKey changes (new message turn).
 * Does NOT scroll for typing state, token chunks, or Convex reference-only updates.
 */
export function useScrollToLatestMessage({
  scrollRef,
  scrollKey,
  enabled = true,
  nearBottomThresholdPx = 96,
}: UseScrollToLatestMessageOptions) {
  const prevKeyRef = useRef<string | undefined>();
  const nearBottomRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const element = el;

    function onScroll() {
      const distance =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      nearBottomRef.current = distance <= nearBottomThresholdPx;
    }

    onScroll();
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [scrollRef, nearBottomThresholdPx]);

  useEffect(() => {
    if (!enabled || !scrollKey || prevKeyRef.current === scrollKey) {
      return;
    }

    const isNewTurn = prevKeyRef.current !== undefined;
    prevKeyRef.current = scrollKey;

    if (isNewTurn && !nearBottomRef.current) {
      return;
    }

    const el = scrollRef.current;
    if (!el) return;

    requestAnimationFrame(() => scrollToBottom(el));
  }, [scrollRef, scrollKey, enabled]);
}
