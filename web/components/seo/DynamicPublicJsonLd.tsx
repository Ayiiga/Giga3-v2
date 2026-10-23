import { brandingAssetUrl } from "@/lib/brandingAssets";
import {
  buildMarketplaceProductJsonLd,
  type MarketplaceSeoReview,
} from "@/lib/seo/marketplaceProductSchema";
import { marketplaceItemUrl } from "@/lib/seo/publicPaths";
import { siteConfig } from "@/lib/site";

type MarketplaceProductJsonLdProps = {
  listingId: string;
  title: string;
  description: string;
  priceGhs: number;
  category?: string;
  imageUrl?: string;
  creatorName?: string;
  /** Genuine listing reviews only — never invent scores or comments. */
  reviews?: MarketplaceSeoReview[];
  /** @deprecated Prefer `reviews`. Kept for call sites that only have aggregates. */
  reviewCount?: number;
  /** @deprecated Prefer `reviews`. */
  ratingValue?: number;
};

/** Product JSON-LD for public marketplace listings — truthful pricing and reviews only. */
export function MarketplaceProductJsonLd({
  listingId,
  title,
  description,
  priceGhs,
  category,
  imageUrl,
  creatorName,
  reviews = [],
  reviewCount = 0,
  ratingValue,
}: MarketplaceProductJsonLdProps) {
  const reviewRows =
    reviews.length > 0
      ? reviews
      : reviewCount > 0 && ratingValue != null
        ? // Aggregate-only fallback: do not invent individual Review entities.
          []
        : [];

  const payload = buildMarketplaceProductJsonLd({
    listingId,
    title,
    description,
    priceGhs,
    url: marketplaceItemUrl(listingId),
    image: imageUrl || brandingAssetUrl("/images/logo.png"),
    category,
    creatorName,
    reviews: reviewRows,
  });

  // When callers only supply aggregates (legacy), keep aggregateRating without fake reviews.
  if (
    !payload.aggregateRating &&
    reviewCount > 0 &&
    ratingValue != null &&
    ratingValue >= 1 &&
    ratingValue <= 5
  ) {
    payload.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount,
      ratingCount: reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

type SocialPostJsonLdProps = {
  postId: string;
  headline: string;
  description: string;
  authorName: string;
  authorHandle: string;
  datePublished: number;
  imageUrl?: string;
};

export function GigaSocialPostJsonLd({
  postId,
  headline,
  description,
  authorName,
  authorHandle,
  datePublished,
  imageUrl,
}: SocialPostJsonLdProps) {
  const payload = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline,
    description,
    url: new URL(`/gigasocial/post/${postId}/`, siteConfig.url).toString(),
    datePublished: new Date(datePublished).toISOString(),
    author: {
      "@type": "Person",
      name: authorName,
      url: new URL(`/gigasocial/profile/${authorHandle}/`, siteConfig.url).toString(),
    },
    image: imageUrl || brandingAssetUrl("/images/logo.png"),
    publisher: {
      "@type": "Organization",
      name: "Giga3 AI",
      logo: {
        "@type": "ImageObject",
        url: brandingAssetUrl("/images/logo.png"),
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

type SocialProfileJsonLdProps = {
  handle: string;
  displayName: string;
  description?: string;
  imageUrl?: string;
};

export function GigaSocialProfileJsonLd({
  handle,
  displayName,
  description,
  imageUrl,
}: SocialProfileJsonLdProps) {
  const payload = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${displayName} on GigaSocial`,
    description,
    url: new URL(`/gigasocial/profile/${handle}/`, siteConfig.url).toString(),
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: `@${handle}`,
      url: new URL(`/gigasocial/profile/${handle}/`, siteConfig.url).toString(),
      image: imageUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
