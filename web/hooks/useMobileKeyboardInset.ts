"use client";

import { useEffect, useState } from "react";

/** Ignore small visualViewport shifts from the mobile browser chrome. */
const KEYBOARD_THRESHOLD_PX = 80;

function measureKeyboardInset(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  const inset = Math.round(window.innerHeight - vv.height - vv.offsetTop);
  return inset >= KEYBOARD_THRESHOLD_PX ? inset : 0;
}

/**
 * Returns pixels to lift the chat composer above the on-screen keyboard.
 * Required because the root viewport uses interactive-widget=overlays-content
 * (keyboard overlays the layout viewport instead of resizing it).
 */
export function useMobileKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setInset(measureKeyboardInset());
      });
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    update();

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return inset;
}
