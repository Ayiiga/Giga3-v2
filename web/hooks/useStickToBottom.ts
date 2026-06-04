"use client";

import { useEffect, useRef, type RefObject } from "react";

interface UseStickToBottomOptions {
  scrollRef: RefObject<HTMLElement | null>;
  anchorRef: RefObject<HTMLElement | null>;
  /** Bump when message list or typing state changes. */
  signal: unknown;
  /** Pin to bottom when user is already near the bottom (default 96px). */
  thresholdPx?: number;
}

/**
 * Scrolls the message list only when appropriate — avoids smooth-scroll jitter
 * and fighting the user while they read older messages.
 */
export function useStickToBottom({
  scrollRef,
  anchorRef,
  signal,
  thresholdPx = 96,
}: UseStickToBottomOptions) {
  const stickRef = useRef(true);
  const lastSignalRef = useRef(signal);

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
    const anchor = anchorRef.current;
    if (!el || !anchor) return;

    const signalChanged = lastSignalRef.current !== signal;
    lastSignalRef.current = signal;

    if (!stickRef.current && !signalChanged) return;

    const run = () => {
      anchor.scrollIntoView({ block: "end", behavior: "auto" });
    };

    requestAnimationFrame(run);
  }, [scrollRef, anchorRef, signal]);
}
