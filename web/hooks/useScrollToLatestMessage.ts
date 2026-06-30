"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface UseScrollToLatestMessageOptions {
  scrollRef: RefObject<HTMLElement | null>;
  scrollKey: string | undefined;
  enabled?: boolean;
  nearBottomThresholdPx?: number;
}

function scrollToBottom(el: HTMLElement, behavior: ScrollBehavior = "auto") {
  el.scrollTo({ top: el.scrollHeight, behavior });
}

export function useScrollToLatestMessage({
  scrollRef,
  scrollKey,
  enabled = true,
  nearBottomThresholdPx = 96,
}: UseScrollToLatestMessageOptions) {
  const prevKeyRef = useRef<string | undefined>();
  const nearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const near = distance <= nearBottomThresholdPx;
      nearBottomRef.current = near;
      setShowScrollButton(!near && el.scrollHeight > el.clientHeight + 120);
    }

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, nearBottomThresholdPx, scrollKey]);

  useEffect(() => {
    if (!enabled || !scrollKey || prevKeyRef.current === scrollKey) {
      return;
    }

    const isNewTurn = prevKeyRef.current !== undefined;
    prevKeyRef.current = scrollKey;

    if (isNewTurn && !nearBottomRef.current) {
      setShowScrollButton(true);
      return;
    }

    const el = scrollRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      scrollToBottom(el, "smooth");
      setShowScrollButton(false);
    });
  }, [scrollRef, scrollKey, enabled]);

  const scrollToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    scrollToBottom(el, "smooth");
    setShowScrollButton(false);
  }, [scrollRef]);

  return { showScrollButton, scrollToLatest };
}
