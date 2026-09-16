import { siteConfig } from "@/lib/site";

export type CreateSubDestinationId = "media" | "gigaedit";

export type CreateSubDestination = {
  id: CreateSubDestinationId;
  label: string;
  shortLabel: string;
  href: string;
  description: string;
};

/** Create tab destinations — Media Studio + GigaEdits. */
export const CREATE_SUB_DESTINATIONS: CreateSubDestination[] = [
  {
    id: "media",
    label: "Media Studio",
    shortLabel: "Studio",
    href: `${siteConfig.links.media}/`,
    description: "AI images & video",
  },
  {
    id: "gigaedit",
    label: "GigaEdits",
    shortLabel: "Edits",
    href: `${siteConfig.links.gigaedit}/`,
    description: "Trim, record & publish",
  },
];

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? "/";
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.endsWith("/") && withoutQuery.length > 1
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
}

export function resolveCreateSubDestination(pathname: string): CreateSubDestinationId | null {
  const path = normalizePath(pathname);
  if (path.startsWith("/media")) return "media";
  if (path.startsWith("/gigaedit")) return "gigaedit";
  return null;
}

export function isCreateSubRoute(pathname: string): boolean {
  return resolveCreateSubDestination(pathname) != null;
}
