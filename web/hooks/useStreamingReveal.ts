"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals assistant text progressively for a streaming-like UX.
 * True token streaming requires backend support; this animates full responses.
 */
export function useStreamingReveal(
  content: string,
  enabled: boolean,
  charsPerTick = 18
): string {
  const [visible, setVisible] = useState(enabled ? "" : content);
  const contentRef = useRef(content);
  const indexRef = useRef(0);

  useEffect(() => {
    contentRef.current = content;
    if (!enabled) {
      setVisible(content);
      indexRef.current = content.length;
      return;
    }
    if (indexRef.current > content.length) {
      indexRef.current = 0;
    }
    const timer = window.setInterval(() => {
      indexRef.current = Math.min(
        contentRef.current.length,
        indexRef.current + charsPerTick
      );
      setVisible(contentRef.current.slice(0, indexRef.current));
      if (indexRef.current >= contentRef.current.length) {
        window.clearInterval(timer);
      }
    }, 16);
    return () => window.clearInterval(timer);
  }, [content, enabled, charsPerTick]);

  return visible;
}
