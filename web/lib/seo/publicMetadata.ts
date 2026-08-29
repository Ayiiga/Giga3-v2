import { brandingAssetUrl } from "@/lib/brandingAssets";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

type PublicMetadataInput = {
  path: string;
  title: string;
  description: string;
};

/** Consistent, canonical metadata for crawlable Giga3 AI marketing pages. */
export function publicMetadata({ path, title, description }: PublicMetadataInput): Metadata {
  const canonicalPath = path === "/" ? "/" : `${path.replace(/\/$/, "")}/`;
  const canonical = new URL(canonicalPath, siteConfig.url).toString();
  const socialTitle = `${title} | Giga3 AI`;
  const image = brandingAssetUrl("/images/logo.png");

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "Giga3 AI",
      title: socialTitle,
      description,
      images: [{ url: image, width: 512, height: 512, alt: "Giga3 AI logo" }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image],
    },
  };
}
