"use client";

import { cn } from "@/lib/utils";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lightweight near-viewport mounting for feed rows.
 * Avoids full virtualization scroll jumps while keeping off-screen media cold.
 */
export const LazyFeedItem = memo(function LazyFeedItem({
  children,
  className,
  rootMargin = "400px 0px",
  minHeightClass = "min-h-[8rem]",
  eager = false,
}: {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
  minHeightClass?: string;
  /** Above-the-fold rows should mount immediately to avoid feed jump. */
  eager?: boolean;
}) {
  const ref = useRef<HTMLLIElement | null>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (eager) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [eager, rootMargin, visible]);

  return (
    <li
      ref={ref}
      className={cn("gigasocial-feed-item", !visible && minHeightClass, className)}
      style={{ contentVisibility: visible ? "visible" : "auto" }}
    >
      {visible ? children : <div className="rounded-2xl border border-border bg-card" aria-hidden />}
    </li>
  );
});
