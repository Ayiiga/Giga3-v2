"use client";

import { useEffect } from "react";

const STABLE_ROUTES = ["/home", "/wallet", "/subscribe", "/credits", "/gigasocial"];

function routeUsesStableViewport(pathname: string): boolean {
  return STABLE_ROUTES.some(
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
    if (routeUsesStableViewport(window.location.pathname)) {
      return;
    }

    const root = document.documentElement;
    const meta = document.querySelector('meta[name="viewport"]');
    const previousClass = root.classList.contains("marketing-route");
    if (!previousClass) root.classList.add("marketing-route");

    const previous = meta?.getAttribute("content") ?? "";
    const next = previous.includes("interactive-widget=")
      ? previous.replace(/interactive-widget=\S+/g, "interactive-widget=resizes-content")
      : `${previous}, interactive-widget=resizes-content`.replace(/^,\s*/, "");

    if (meta) meta.setAttribute("content", next);

    return () => {
      root.classList.remove("marketing-route");
      if (meta) meta.setAttribute("content", previous);
    };
  }, []);

  return null;
}
