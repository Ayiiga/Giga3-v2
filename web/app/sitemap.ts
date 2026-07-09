import { siteConfig } from "@/lib/site";
import type { MetadataRoute } from "next";

/** Public marketing routes only — excludes authenticated /chat, /payment, and seller flows. */
const PUBLIC_PATHS = [
  "/",
  "/pricing/",
  "/subscribe/",
  "/credits/",
  "/creator-studio/",
  "/gigalearn/",
  "/enterprise/",
  "/workspace/",
  "/automation/",
  "/gigasocial/",
  "/gigasocial/post/",
  "/media/",
  "/video/",
  "/video/plans/",
  "/marketplace/",
  "/wallet/",
  "/insights/",
  "/offline/",
  "/legal/",
  "/legal/privacy/",
  "/legal/terms/",
  "/legal/cookies/",
  "/legal/refunds/",
  "/legal/acceptable-use/",
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
