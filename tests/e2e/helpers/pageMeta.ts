import type { Page } from "@playwright/test";

export type PageMeta = {
  title: string | null;
  canonical: string | null;
  robots: string | null;
  hasJsonLd: boolean;
};

export async function readPageMeta(page: Page): Promise<PageMeta> {
  return page.evaluate(() => {
    const title = document.title?.trim() || null;
    const canonical =
      document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() || null;
    const robots =
      document.querySelector('meta[name="robots"]')?.getAttribute("content")?.trim() || null;
    const hasJsonLd = Boolean(document.querySelector('script[type="application/ld+json"]'));
    return { title, canonical, robots, hasJsonLd };
  });
}

export function isIndexable(robots: string | null): boolean {
  if (!robots) return true;
  const lower = robots.toLowerCase();
  if (lower.includes("noindex")) return false;
  return lower.includes("index") || !lower.includes("nofollow");
}

export function isNoIndex(robots: string | null): boolean {
  if (!robots) return false;
  return robots.toLowerCase().includes("noindex");
}
