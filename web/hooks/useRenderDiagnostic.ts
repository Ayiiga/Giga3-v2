"use client";

import { probeRender } from "@/lib/debug/renderProbe";
import { useEffect, useRef } from "react";

/**
 * Logs render counts for chat debugging.
 * Enable with ?renderProbe=1 or localStorage.giga3_render_probe=1
 */
export function useRenderDiagnostic(component: string): number {
  const countRef = useRef(0);
  countRef.current += 1;
  probeRender(component);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const enabled =
      window.location.search.includes("renderProbe=1") ||
      window.localStorage.getItem("giga3_render_probe") === "1";
    if (!enabled) return;
    console.debug(`[giga3-render] ${component} render #${countRef.current}`);
  });

  return countRef.current;
}
