import { brandingAssetUrl } from "@/lib/brandingAssets";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

type PublicMetadataInput = {
  path: string;
  title: string;
  description: string;
  /** Defaults to indexable public pages. Set false for authenticated-only surfaces. */
  index?: boolean;
};

/** Consistent, canonical metadata for crawlable Giga3 AI marketing pages. */
export function publicMetadata({
  path,
  title,
  description,
  index = true,
}: PublicMetadataInput): Metadata {
  const canonicalPath = path === "/" ? "/" : `${path.replace(/\/$/, "")}/`;
  const canonical = new URL(canonicalPath, siteConfig.url).toString();
  const socialTitle = title.includes("Giga3") ? title : `${title} | Giga3 AI`;
  const image = brandingAssetUrl("/images/logo.png");
  /** Avoid root layout `%s | Giga3 AI` duplicating titles that already include the brand. */
  const documentTitle = title.includes("Giga3") ? { absolute: title } : title;

  return {
    title: documentTitle,
    description,
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
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
