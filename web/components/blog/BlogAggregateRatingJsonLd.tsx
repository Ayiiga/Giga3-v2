"use client";

import { useBlogRating } from "@/hooks/useBlogRating";
import { siteConfig } from "@/lib/site";

type BlogAggregateRatingJsonLdProps = {
  slug: string;
  path: string;
};

/**
 * Inject AggregateRating only when real Convex ratings exist.
 * Never emits invented scores into structured data.
 */
export function BlogAggregateRatingJsonLd({ slug, path }: BlogAggregateRatingJsonLdProps) {
  const { ratingAvg, ratingCount, hasRatings, loading } = useBlogRating(slug);
  if (loading || !hasRatings) return null;

  const pageUrl = new URL(path.endsWith("/") ? path : `${path}/`, siteConfig.url).toString();
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": pageUrl,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ratingAvg,
      bestRating: 5,
      worstRating: 1,
      ratingCount,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
