import { PRIMARY_NAV_PRODUCT_SCOPE } from "@/lib/navigation/editsDestinations";
import { siteConfig } from "@/lib/site";
import type { LucideIcon } from "lucide-react";
import { Home, Play, Scissors, Sparkles } from "lucide-react";

/** Re-export scope notes for docs and UI copy. */
export { PRIMARY_NAV_PRODUCT_SCOPE };

export type PrimaryNavTabId = "home" | "studio" | "edits" | "social";

export type PrimaryNavTab = {
  id: PrimaryNavTabId;
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

/** Routes where the global 4-tab nav must not appear (login, share, payment, etc.). */
const HIDDEN_PREFIXES = ["/chat/login", "/chat/share", "/payment/"];

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? "/";
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.endsWith("/") && withoutQuery.length > 1
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
}

export const PRIMARY_NAV_TABS: PrimaryNavTab[] = [
  {
    id: "home",
    label: "Home",
    href: siteConfig.links.dashboard,
    icon: Home,
    match: (pathname) => {
      const path = normalizePath(pathname);
      return path === "/chat" || path.startsWith("/chat/");
    },
  },
  {
    id: "studio",
    label: "Studio",
    href: siteConfig.links.media,
    icon: Sparkles,
    match: (pathname) => normalizePath(pathname).startsWith("/media"),
  },
  {
    id: "edits",
    label: "Edits",
    href: `${siteConfig.links.gigaedit}/`,
    icon: Scissors,
    match: (pathname) => normalizePath(pathname).startsWith("/gigaedit"),
  },
  {
    id: "social",
    label: "Social",
    href: siteConfig.links.gigasocial,
    icon: Play,
    match: (pathname) => normalizePath(pathname).startsWith("/gigasocial"),
  },
];

export function isPrimaryNavHiddenPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** True when the current URL is one of the four primary product destinations. */
export function isPrimaryNavRoute(pathname: string): boolean {
  if (isPrimaryNavHiddenPath(pathname)) return false;
  return PRIMARY_NAV_TABS.some((tab) => tab.match(pathname));
}

export function resolvePrimaryNavTab(pathname: string): PrimaryNavTabId | null {
  if (!isPrimaryNavRoute(pathname)) return null;
  const tab = PRIMARY_NAV_TABS.find((item) => item.match(pathname));
  return tab?.id ?? null;
}

/**
 * Desktop left rail: same four destinations, but chat already has a sidebar on large screens.
 */
export function shouldShowDesktopRail(pathname: string): boolean {
  if (!isPrimaryNavRoute(pathname)) return false;
  const path = normalizePath(pathname);
  if (path === "/chat" || path.startsWith("/chat/")) return false;
  return true;
}

/** CSS custom property names consumed by primary-nav.css */
export const PRIMARY_NAV_HEIGHT_VAR = "--primary-nav-height";
export const PRIMARY_NAV_OFFSET_VAR = "--primary-nav-offset";
export const PRIMARY_NAV_RAIL_WIDTH_VAR = "--primary-nav-rail-width";
