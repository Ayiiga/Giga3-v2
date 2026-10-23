/**
 * Marketplace Product JSON-LD helpers.
 * Never invent reviews or aggregate ratings — only emit what listings actually have.
 */

export type MarketplaceSeoReview = {
  rating: number;
  comment?: string;
  createdAt: number;
};

/** Titles/creators that must not appear as indexed Product entities (QA fixtures). */
export function isExcludedMarketplaceSeoListing(input: {
  title?: string | null;
  creatorName?: string | null;
  creatorHandle?: string | null;
}): boolean {
  const haystack = [input.title, input.creatorName, input.creatorHandle]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  return (
    /\be2e\b/.test(haystack) ||
    /\bqa\s*test\b/.test(haystack) ||
    /\btest\s*ebook\b/.test(haystack) ||
    /\bload\s*test\b/.test(haystack)
  );
}

export function buildMarketplaceProductJsonLd(input: {
  listingId: string;
  title: string;
  description: string;
  priceGhs: number;
  url: string;
  image: string;
  category?: string;
  creatorName?: string;
  reviews?: MarketplaceSeoReview[];
}): Record<string, unknown> {
  const reviews = (input.reviews ?? []).filter(
    (r) => Number.isFinite(r.rating) && r.rating >= 1 && r.rating <= 5
  );

  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description,
    url: input.url,
    image: input.image,
    brand: {
      "@type": "Brand",
      name: "Giga3 AI Marketplace",
    },
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: "GHS",
      price: Number(input.priceGhs).toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(input.creatorName
        ? {
            seller: {
              "@type": "Organization",
              name: input.creatorName,
            },
          }
        : {}),
    },
  };

  if (input.category) {
    payload.category = input.category;
  }

  if (reviews.length === 0) {
    return payload;
  }

  const ratingValue =
    Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;

  payload.aggregateRating = {
    "@type": "AggregateRating",
    ratingValue,
    reviewCount: reviews.length,
    ratingCount: reviews.length,
    bestRating: 5,
    worstRating: 1,
  };

  // Author is anonymized (buyer id is never public). Reviews are still real DB rows
  // shown on the listing page — use a role label, not a fabricated personal name.
  payload.review = reviews.map((review) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: "Verified purchaser",
    },
    datePublished: new Date(review.createdAt).toISOString(),
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    ...(review.comment?.trim()
      ? { reviewBody: review.comment.trim().slice(0, 5000) }
      : {}),
  }));

  return payload;
}
