"use client";

import { useEffect, useRef, type RefObject } from "react";

interface UseScrollToLatestMessageOptions {
  scrollRef: RefObject<HTMLElement | null>;
  /** Convex message id or optimistic pending-user id — scroll only when this changes. */
  lastMessageId: string | undefined;
  enabled?: boolean;
}

/**
 * Scrolls once when a new message id appears.
 * Does NOT scroll for typing state, isSending, or Convex reference-only updates.
 */
export function useScrollToLatestMessage({
  scrollRef,
  lastMessageId,
  enabled = true,
}: UseScrollToLatestMessageOptions) {
  const prevIdRef = useRef<string | undefined>();

  useEffect(() => {
    if (!enabled || !lastMessageId || prevIdRef.current === lastMessageId) {
      return;
    }
    prevIdRef.current = lastMessageId;

    const el = scrollRef.current;
    if (!el) return;

    const target = el.scrollHeight - el.clientHeight;
    if (Math.abs(el.scrollTop - target) <= 2) return;
    el.scrollTop = target;
  }, [scrollRef, lastMessageId, enabled]);
}
