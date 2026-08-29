"use client";

import { isRenderProbeEnabled, probeRender } from "@/lib/debug/renderProbe";
import { useEffect, useRef } from "react";

/**
 * Logs render counts for chat/media debugging.
 * Enable with ?renderProbe=1 or localStorage.giga3_render_probe=1
 */
export function useRenderDiagnostic(component: string): number {
  const countRef = useRef(0);
  countRef.current += 1;
  probeRender(component);

  const loggedRef = useRef(0);
  useEffect(() => {
    if (!isRenderProbeEnabled()) return;
    if (loggedRef.current === countRef.current) return;
    loggedRef.current = countRef.current;
    console.debug(`[giga3-render] ${component} render #${countRef.current}`);
  });

  return countRef.current;
}
