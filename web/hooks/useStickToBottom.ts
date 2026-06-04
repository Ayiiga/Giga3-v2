"use client";

import { useEffect, useRef, type RefObject } from "react";

interface UseStickToBottomOptions {
  scrollRef: RefObject<HTMLElement | null>;
  messageCount: number;
  lastMessageId: string | undefined;
  isTyping: boolean;
  thresholdPx?: number;
}

function scrollToBottom(el: HTMLElement): void {
  const target = el.scrollHeight - el.clientHeight;
  if (Math.abs(el.scrollTop - target) <= 1) return;
  el.scrollTop = target;
}

/**
 * Pins the message scroller to the bottom when the user is already there.
 * Uses scrollTop (not scrollIntoView) to avoid scroll chaining / layout feedback loops.
 */
export function useStickToBottom({
  scrollRef,
  messageCount,
  lastMessageId,
  isTyping,
  thresholdPx = 96,
}: UseStickToBottomOptions) {
  const stickRef = useRef(true);
  const signatureRef = useRef("");

  const signature = `${messageCount}:${lastMessageId ?? ""}:${isTyping}`;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickRef.current = distance <= thresholdPx;
    }

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, thresholdPx]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const changed = signatureRef.current !== signature;
    signatureRef.current = signature;
    if (!changed) return;

    if (!stickRef.current && !isTyping) return;

    requestAnimationFrame(() => {
      scrollToBottom(el);
    });
  }, [scrollRef, signature, isTyping]);
}
