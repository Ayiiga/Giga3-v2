import { brandingAssetUrl } from "@/lib/brandingAssets";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

type PublicMetadataInput = {
  path: string;
  title: string;
  description: string;
  /** Defaults to indexable public pages. Set false for authenticated-only surfaces. */
  index?: boolean;
  /** Absolute or site-relative image for Open Graph / Twitter cards. */
  image?: string;
  imageAlt?: string;
};

/** Consistent, canonical metadata for crawlable Giga3 AI marketing pages. */
export function publicMetadata({
  path,
  title,
  description,
  index = true,
  image: imageOverride,
  imageAlt,
}: PublicMetadataInput): Metadata {
  const canonicalPath = path === "/" ? "/" : `${path.replace(/\/$/, "")}/`;
  const canonical = new URL(canonicalPath, siteConfig.url).toString();
  const socialTitle = title.includes("Giga3") ? title : `${title} | Giga3 AI`;
  const fallbackImage = brandingAssetUrl("/images/logo.png");
  const image = imageOverride?.trim() || fallbackImage;
  const alt = imageAlt?.trim() || (imageOverride ? title : "Giga3 AI logo");
  /** Avoid root layout `%s | Giga3 AI` duplicating titles that already include the brand. */
  const documentTitle = title.includes("Giga3") ? { absolute: title } : title;

  return {
    title: documentTitle,
    description,
    robots: index
      ? {
          index: true,
          follow: true,
          "max-image-preview": "large",
          googleBot: { index: true, follow: true, "max-image-preview": "large" },
        }
      : { index: false, follow: false },
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "Giga3 AI",
      title: socialTitle,
      description,
      images: [{ url: image, width: imageOverride ? 1200 : 512, height: imageOverride ? 630 : 512, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image],
    },
  };
}
