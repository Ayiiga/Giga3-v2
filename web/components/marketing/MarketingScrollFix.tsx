"use client";

import { useEffect } from "react";

const STABLE_VIEWPORT_ROUTES = ["/home", "/wallet", "/subscribe", "/credits", "/gigasocial"];

function usesStableViewport(pathname: string): boolean {
  return STABLE_VIEWPORT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Marketing routes use long forms (marketplace sell, pricing). The root viewport
 * sets interactive-widget=overlays-content for chat stability; on marketing pages
 * that traps fields under the mobile keyboard.
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
