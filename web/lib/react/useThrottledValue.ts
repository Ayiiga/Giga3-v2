"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Batches rapid value updates (e.g. future token streaming) to at most once per `ms`.
 * Not used for Convex batch replies today — reserved for client-side streaming UI.
 */
export function useThrottledValue<T>(value: T, ms = 200): T {
  const [throttled, setThrottled] = useState(value);
  const latestRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestRef.current = value;
    if (timerRef.current) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setThrottled(latestRef.current);
    }, ms);
  }, [value, ms]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return throttled;
}
