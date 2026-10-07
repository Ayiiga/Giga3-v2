import { siteConfig } from "@/lib/site";

/** Stable @id URLs for JSON-LD entity references across public pages. */
export const SEO_ORGANIZATION_ID = `${siteConfig.url}/#organization`;
export const SEO_WEBSITE_ID = `${siteConfig.url}/#website`;

export function seoPageId(path: string): string {
  const normalized = path === "/" ? "/" : `${path.replace(/\/$/, "")}/`;
  return new URL(normalized, siteConfig.url).toString();
}
