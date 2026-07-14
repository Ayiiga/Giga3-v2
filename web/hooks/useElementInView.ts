"use client";

import { useEffect, useRef, useState } from "react";

type UseElementInViewOptions = {
  threshold?: number | number[];
  rootMargin?: string;
  enabled?: boolean;
};

/** True when the element is sufficiently visible for media autoplay. */
export function useElementInView<T extends HTMLElement>({
  threshold = 0.55,
  rootMargin = "0px",
  enabled = true,
}: UseElementInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setInView(false);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const minRatio = Array.isArray(threshold)
          ? Math.min(...threshold)
          : threshold;
        setInView(entry.isIntersecting && entry.intersectionRatio >= minRatio);
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, rootMargin, threshold]);

  return { ref, inView };
}
