"use client";

import { PrimaryNav } from "@/components/navigation/PrimaryNav";
import {
  isPrimaryNavRoute,
  shouldShowDesktopRail,
} from "@/lib/navigation/primaryNav";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function readHtmlFlags() {
  const html = document.documentElement;
  return {
    immersive: html.classList.contains("gigaedit-video-mode"),
    keyboardOpen: html.classList.contains("chat-keyboard-open"),
  };
}

/**
 * Mounts the global 4-tab nav on product routes and toggles layout CSS hooks on <html>.
 */
export function PrimaryNavHost() {
  const pathname = usePathname() ?? "/";
  const onProductRoute = isPrimaryNavRoute(pathname);
  const showRail = shouldShowDesktopRail(pathname);
  const [flags, setFlags] = useState({ immersive: false, keyboardOpen: false });
  const navBarVisible =
    onProductRoute && !flags.immersive && !flags.keyboardOpen;

  useEffect(() => {
    if (!onProductRoute) return;
    const sync = () => setFlags(readHtmlFlags());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [onProductRoute, pathname]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("primary-nav-route", onProductRoute);
    html.classList.toggle("primary-nav-rail", onProductRoute && showRail);
    html.classList.toggle("primary-nav-bar-visible", navBarVisible);
    return () => {
      html.classList.remove(
        "primary-nav-route",
        "primary-nav-rail",
        "primary-nav-bar-visible"
      );
    };
  }, [onProductRoute, showRail, navBarVisible]);

  if (!onProductRoute) return null;

  return (
    <PrimaryNav
      pathname={pathname}
      immersive={flags.immersive}
      keyboardOpen={flags.keyboardOpen}
    />
  );
}
