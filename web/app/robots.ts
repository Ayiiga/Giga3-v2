import { siteConfig } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/chat/", "/payment/", "/wallet/", "/workspace/", "/admin/", "/marketplace/purchases/", "/marketplace/sell/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
