import { brandingAssetUrl } from "@/lib/brandingAssets";
import { siteConfig } from "@/lib/site";
import type { BlogPost } from "@/lib/blog/types";

type BlogArticleJsonLdProps = {
  post: BlogPost;
  path: string;
};

/** Article + BreadcrumbList structured data for blog posts. */
export function BlogArticleJsonLd({ post, path }: BlogArticleJsonLdProps) {
  const pageUrl = new URL(path.endsWith("/") ? path : `${path}/`, siteConfig.url).toString();
  const image = post.featuredImage.startsWith("http")
    ? post.featuredImage
    : new URL(brandingAssetUrl(post.featuredImage), siteConfig.url).toString();
  const modified = post.updatedAt ?? post.publishedAt;

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: [image],
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Giga3 AI",
      logo: {
        "@type": "ImageObject",
        url: new URL(brandingAssetUrl("/images/logo.png"), siteConfig.url).toString(),
      },
    },
    datePublished: `${post.publishedAt}T00:00:00.000Z`,
    dateModified: `${modified}T00:00:00.000Z`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    articleSection: post.category,
    keywords: (post.keywords ?? post.tags).join(", "),
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Giga3 AI",
        item: siteConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: new URL("/blog/", siteConfig.url).toString(),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}
