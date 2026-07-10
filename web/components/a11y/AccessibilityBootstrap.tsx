"use client";

import { useEffect } from "react";

const STORAGE_KEY = "giga3_a11y_prefs";

type A11yPrefs = {
  largeText: boolean;
  reducedMotion: boolean;
};

function loadPrefs(): A11yPrefs {
  if (typeof window === "undefined") return { largeText: false, reducedMotion: false };
  try {
    return { largeText: false, reducedMotion: false, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return { largeText: false, reducedMotion: false };
  }
}

function getScopeElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("main-content");
}

function applyPrefs(prefs: A11yPrefs) {
  const root = document.documentElement;
  const scope = getScopeElement();
  root.classList.toggle("giga3-reduced-motion", prefs.reducedMotion);
  scope?.classList.toggle("giga3-large-text-scope", prefs.largeText);
}

/** Applies persisted accessibility preferences on mount. */
export function AccessibilityBootstrap() {
  useEffect(() => {
    applyPrefs(loadPrefs());

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      const prefs = { ...loadPrefs(), reducedMotion: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      applyPrefs(prefs);
    }
  }, []);

  return null;
}

export function saveA11yPrefs(patch: Partial<A11yPrefs>) {
  const next = { ...loadPrefs(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  applyPrefs(next);
}

export function getA11yPrefs(): A11yPrefs {
  return loadPrefs();
}
