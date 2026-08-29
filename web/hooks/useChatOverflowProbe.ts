"use client";

import {
  isChatOverflowProbeEnabled,
  probeChatOverflow,
} from "@/lib/debug/chatOverflowProbe";
import { useEffect } from "react";

/** Dev-only: log elements that exceed the chat viewport width. */
export function useChatOverflowProbe(deps: unknown[] = []) {
  useEffect(() => {
    if (!isChatOverflowProbeEnabled()) return;

    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        probeChatOverflow();
      });
    };

    run();
    window.addEventListener("resize", run);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(run)
        : null;
    const scrollRoot = document.querySelector(".chat-message-scroll-region");
    if (observer && scrollRoot) observer.observe(scrollRoot);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", run);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when messages/layout change
  }, deps);
}
