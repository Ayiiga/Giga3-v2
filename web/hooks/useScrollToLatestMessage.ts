"use client";

import { useEffect, useRef, type RefObject } from "react";

interface UseScrollToLatestMessageOptions {
  scrollRef: RefObject<HTMLElement | null>;
  /** Scroll only when this id changes (new / pending message). */
  anchorMessageId: string | undefined;
}

/**
 * Scrolls the message list once per new message id.
 * No stick-to-bottom loop, no scroll listeners, no requestAnimationFrame retries.
 */
export function useScrollToLatestMessage({
  scrollRef,
  anchorMessageId,
}: UseScrollToLatestMessageOptions) {
  const prevIdRef = useRef<string | undefined>();

  useEffect(() => {
    if (!anchorMessageId || prevIdRef.current === anchorMessageId) return;
    prevIdRef.current = anchorMessageId;

    const el = scrollRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, [scrollRef, anchorMessageId]);
}
