"use client";

import { useEffect } from "react";

const STABLE_VIEWPORT_ROUTES = ["/home", "/wallet", "/subscribe", "/credits", "/gigasocial"];

function usesStableViewport(pathname: string): boolean {
  return STABLE_VIEWPORT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Root viewport uses interactive-widget=overlays-content for chat/GigaSocial
 * stability. Marketing form pages need resizes-content so inputs are not trapped
 * under the soft keyboard. Stable app shells keep overlays-content.
 */
export function MarketingScrollFix() {
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="viewport"]');
    const hadMarketingRoute = root.classList.contains("marketing-route");
    if (!hadMarketingRoute) root.classList.add("marketing-route");

    const skipViewportWidget = usesStableViewport(window.location.pathname);
    const previous = meta?.getAttribute("content") ?? "";
    const next = previous.includes("interactive-widget=")
      ? previous.replace(/interactive-widget=\S+/g, "interactive-widget=resizes-content")
      : `${previous}, interactive-widget=resizes-content`.replace(/^,\s*/, "");

    if (!skipViewportWidget && meta) {
      meta.setAttribute("content", next);
    }

    return () => {
      if (!hadMarketingRoute) root.classList.remove("marketing-route");
      if (!skipViewportWidget && meta) meta.setAttribute("content", previous);
    };
  }, []);

  return null;
}
