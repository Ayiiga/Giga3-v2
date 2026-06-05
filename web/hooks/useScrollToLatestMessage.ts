"use client";

import { useEffect, useRef, type RefObject } from "react";

interface UseScrollToLatestMessageOptions {
  scrollRef: RefObject<HTMLElement | null>;
  /** Convex message id or optimistic pending-user id — scroll only when this changes. */
  lastMessageId: string | undefined;
  enabled?: boolean;
  /** Skip auto-scroll when user is reading older messages (px from bottom). */
  nearBottomThresholdPx?: number;
}

/**
 * Scrolls once when a new message id appears.
 * Does NOT scroll for typing state, isSending, token chunks, or Convex reference-only updates.
 */
export function useScrollToLatestMessage({
  scrollRef,
  lastMessageId,
  enabled = true,
  nearBottomThresholdPx = 96,
}: UseScrollToLatestMessageOptions) {
  const prevIdRef = useRef<string | undefined>();
  const nearBottomRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      nearBottomRef.current = distance <= nearBottomThresholdPx;
    }

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, nearBottomThresholdPx]);

  useEffect(() => {
    if (!enabled || !lastMessageId || prevIdRef.current === lastMessageId) {
      return;
    }

    const isNewMessage = prevIdRef.current !== undefined;
    prevIdRef.current = lastMessageId;

    if (isNewMessage && !nearBottomRef.current) {
      return;
    }

    const el = scrollRef.current;
    if (!el) return;

    const applyScroll = () => {
      const target = el.scrollHeight - el.clientHeight;
      if (Math.abs(el.scrollTop - target) <= 2) return;
      el.scrollTop = target;
    };

    requestAnimationFrame(applyScroll);
  }, [scrollRef, lastMessageId, enabled]);
}
