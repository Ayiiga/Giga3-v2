import { brandingAssetUrl } from "@/lib/brandingAssets";
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
  reviewCount?: number;
  ratingValue?: number;
};

/** Product JSON-LD for public marketplace listings — truthful pricing only. */
export function MarketplaceProductJsonLd({
  listingId,
  title,
  description,
  priceGhs,
  category,
  imageUrl,
  creatorName,
  reviewCount = 0,
  ratingValue,
}: MarketplaceProductJsonLdProps) {
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description,
    url: marketplaceItemUrl(listingId),
    category,
    image: imageUrl || brandingAssetUrl("/images/logo.png"),
    brand: {
      "@type": "Brand",
      name: "Giga3 AI Marketplace",
    },
    offers: {
      "@type": "Offer",
      url: marketplaceItemUrl(listingId),
      priceCurrency: "GHS",
      price: priceGhs,
      availability: "https://schema.org/InStock",
      seller: creatorName
        ? {
            "@type": "Organization",
            name: creatorName,
          }
        : undefined,
    },
  };

  if (reviewCount > 0 && ratingValue != null) {
    payload.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount,
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
