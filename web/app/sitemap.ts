import { siteConfig } from "@/lib/site";
import type { MetadataRoute } from "next";

/** Canonical, crawlable marketing routes only — never include application or account pages. */
const PUBLIC_PATHS = [
  "/",
  "/gigasocial/",
  "/gigaedits/",
  "/gigalearn/",
  "/ai-studio/",
  "/marketplace/",
  "/about/",
  "/pricing/",
  "/download/",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${base}${path === "/" ? "/" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
