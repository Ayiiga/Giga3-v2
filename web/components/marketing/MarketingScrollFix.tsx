"use client";

import { useEffect } from "react";

/**
 * Marketing routes use long forms (marketplace sell, pricing). The root viewport
 * sets interactive-widget=overlays-content for chat stability; on marketing pages
 * that traps fields under the mobile keyboard. Resizes-visual restores scroll.
 */
export function MarketingScrollFix() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    const previous = meta.getAttribute("content") ?? "";
    const next = previous.includes("interactive-widget=")
      ? previous.replace(/interactive-widget=\S+/g, "interactive-widget=resizes-visual")
      : `${previous}, interactive-widget=resizes-visual`.replace(/^,\s*/, "");

    meta.setAttribute("content", next);

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches("input, textarea, select")) return;
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "center", behavior: "auto" });
      });
    };

    document.addEventListener("focusin", onFocusIn);

    return () => {
      meta.setAttribute("content", previous);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return null;
}
