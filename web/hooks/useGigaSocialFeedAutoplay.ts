"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gigasocial_feed_autoplay_paused";

function readPaused(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Feed-level autoplay pause preference (persists for the browser session). */
export function useGigaSocialFeedAutoplay() {
  const [paused, setPaused] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPaused(readPaused());
    setHydrated(true);
  }, []);

  const pause = useCallback(() => {
    setPaused(true);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (paused) resume();
    else pause();
  }, [pause, paused, resume]);

  return {
    paused,
    hydrated,
    pause,
    resume,
    toggle,
    autoPlay: hydrated && !paused,
  };
}
