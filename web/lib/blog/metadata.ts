import { brandingAssetUrl } from "@/lib/brandingAssets";
import { siteConfig } from "@/lib/site";
import type { BlogPost } from "@/lib/blog/types";
import type { Metadata } from "next";

function blogPath(slug: string): string {
  return `/blog/${slug}`;
}

/** Article-specific metadata with Open Graph article fields. */
export function blogArticleMetadata(post: BlogPost): Metadata {
  const path = blogPath(post.slug);
  const canonicalPath = `${path}/`;
  const canonical = new URL(canonicalPath, siteConfig.url).toString();
  const socialTitle = post.title.includes("Giga3") ? post.title : `${post.title} | Giga3 AI`;
  const documentTitle = post.title.includes("Giga3") ? { absolute: post.title } : post.title;
  const image = post.featuredImage.startsWith("http")
    ? post.featuredImage
    : brandingAssetUrl(post.featuredImage);
  const modified = post.updatedAt ?? post.publishedAt;

  return {
    title: documentTitle,
    description: post.description,
    keywords: post.keywords ?? post.tags,
    authors: [{ name: post.author }],
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: "Giga3 AI",
      title: socialTitle,
      description: post.description,
      publishedTime: `${post.publishedAt}T00:00:00.000Z`,
      modifiedTime: `${modified}T00:00:00.000Z`,
      authors: [post.author],
      section: post.category,
      tags: post.tags,
      images: [{ url: image, alt: post.featuredImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: post.description,
      images: [image],
    },
  };
}

export function blogIndexMetadata(): Metadata {
  const path = "/blog";
  const canonicalPath = `${path}/`;
  const canonical = new URL(canonicalPath, siteConfig.url).toString();
  const title = "Giga3 AI Blog — AI, Education & Technology in Ghana";
  const description =
    "Guides on artificial intelligence, education, BECE and WASSCE preparation, creator tools, business automation and digital opportunities in Ghana and across Africa.";
  const image = brandingAssetUrl("/images/blog/blog-hero.svg");

  return {
    title: { absolute: title },
    description,
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "Giga3 AI",
      title,
      description,
      images: [{ url: image, alt: "Giga3 AI Blog" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
