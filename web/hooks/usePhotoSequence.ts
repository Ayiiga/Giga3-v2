"use client";

import { useEffect, useState } from "react";

/** Schedule a single advance; each manual change starts a fresh reading interval. */
export function usePhotoSequence(index: number, count: number, active: boolean, advance: () => void) {
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync();
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    if (count < 2 || !active || !playing || !visible) return;
    const timer = window.setTimeout(advance, 4000);
    return () => window.clearTimeout(timer);
  }, [active, advance, count, index, playing, visible]);

  return { playing, toggle: () => setPlaying(value => !value) };
}
