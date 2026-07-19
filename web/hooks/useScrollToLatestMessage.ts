"use client";

import { dispatchChatViewportSync } from "@/lib/chat/chatViewportEvents";
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
      const node = scrollRef.current;
      if (!node) return;
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      const near = distance <= nearBottomThresholdPx;
      nearBottomRef.current = near;
      setShowScrollButton(!near && node.scrollHeight > node.clientHeight + 120);
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
      scrollToBottom(el, "auto");
      setShowScrollButton(false);
      dispatchChatViewportSync({ reason: "scroll" });
    });
  }, [scrollRef, scrollKey, enabled]);

  const scrollToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    scrollToBottom(el, "auto");
    setShowScrollButton(false);
  }, [scrollRef]);

  return { showScrollButton, scrollToLatest };
}
