import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { MarketplaceProductJsonLd } from "@/components/seo/DynamicPublicJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchMarketplaceListingIds, fetchMarketplaceSeoBundle } from "@/lib/seo/convexBuildFetch";
import { isExcludedMarketplaceSeoListing } from "@/lib/seo/marketplaceProductSchema";
import { marketplaceItemPath } from "@/lib/seo/publicPaths";
import { clampSeoDescription, clampSeoTitle } from "@/lib/seo/seoText";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import nextDynamic from "next/dynamic";
import type { Metadata } from "next";

const MarketplaceItemDetailShell = nextDynamic(
  () =>
    import("@/components/marketplace/MarketplaceItemDetailShell").then((m) => ({
      default: m.MarketplaceItemDetailShell,
    })),
  { ssr: false }
);

type PageProps = {
  params: { listingId: string };
};

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const listingIds = await fetchMarketplaceListingIds();
    return listingIds.length ? listingIds.map((listingId) => ({ listingId })) : [{ listingId: "__build_placeholder__" }];
  } catch {
    return [{ listingId: "__build_placeholder__" }];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const bundle = await fetchMarketplaceSeoBundle(params.listingId);
  if (!bundle) {
    return publicMetadata({
      path: marketplaceItemPath(params.listingId),
      title: "Marketplace product not found",
      description: "This Giga3 AI Marketplace listing is unavailable or no longer published.",
      index: false,
    });
  }

  const excluded = isExcludedMarketplaceSeoListing({
    title: bundle.listing.title,
    creatorName: bundle.creator?.displayName,
    creatorHandle: bundle.creator?.handle,
  });
  const indexable = bundle.indexable !== false && !excluded;

  const creatorLabel = bundle.creator?.displayName
    ? ` by ${bundle.creator.displayName}`
    : "";
  const ref = params.listingId.length > 8 ? params.listingId.slice(-8) : params.listingId;

  return publicMetadata({
    path: marketplaceItemPath(params.listingId),
    title: clampSeoTitle(`${bundle.listing.title}${creatorLabel}`, ref),
    description: clampSeoDescription(bundle.description, ref),
    image: bundle.listing.coverImageUrl,
    imageAlt: bundle.listing.title,
    index: indexable,
  });
}

export default async function MarketplaceItemDetailPage({ params }: PageProps) {
  const bundle = await fetchMarketplaceSeoBundle(params.listingId);

  if (!bundle) {
    return (
      <ProductSeoHeader
        title="Marketplace product not found"
        description="This listing may have been removed or is not yet approved for public sale."
        showProductNav={false}
      />
    );
  }

  const excluded = isExcludedMarketplaceSeoListing({
    title: bundle.listing.title,
    creatorName: bundle.creator?.displayName,
    creatorHandle: bundle.creator?.handle,
  });
  const indexable = bundle.indexable !== false && !excluded;
  const reviews = (bundle.reviews ?? []).filter((r) => r.rating >= 1 && r.rating <= 5);

  const creatorLine = bundle.creator
    ? `Sold by ${bundle.creator.displayName}${bundle.creator.verified ? " (verified)" : ""}.`
    : "Sold by a Giga3 Marketplace creator.";

  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Marketplace", path: "/marketplace" },
          { name: bundle.listing.title, path: marketplaceItemPath(params.listingId) },
        ]}
      />
      {indexable ? (
        <MarketplaceProductJsonLd
          listingId={params.listingId}
          title={bundle.listing.title}
          description={bundle.description}
          priceGhs={bundle.listing.priceGhs}
          category={bundle.listing.category}
          imageUrl={bundle.listing.coverImageUrl}
          creatorName={bundle.creator?.displayName}
          reviews={reviews}
          reviewCount={bundle.reviewCount}
          ratingValue={bundle.ratingValue}
        />
      ) : null}
      <ProductSeoHeader
        compact
        collapsible
        expandLabel="Read more"
        collapseLabel="Show less"
        title={bundle.listing.title}
        description={bundle.description}
        detail={`${creatorLine} Pay with Paystack in GHS — downloads unlock only after payment.`}
        coverImageUrl={bundle.listing.coverImageUrl}
        coverImageAlt={`${bundle.listing.title} cover`}
        showProductNav={false}
      />
      {reviews.length > 0 ? (
        <section className="mx-auto max-w-3xl px-4 pb-6" aria-label="Customer reviews">
          <h2 className="text-lg font-semibold text-foreground">Reviews</h2>
          <p className="mt-1 text-sm text-muted">
            {bundle.ratingValue != null
              ? `${bundle.ratingValue} out of 5 from ${bundle.reviewCount} verified purchaser${
                  bundle.reviewCount === 1 ? "" : "s"
                }.`
              : `${bundle.reviewCount} verified purchaser review${bundle.reviewCount === 1 ? "" : "s"}.`}
          </p>
          <ul className="mt-3 space-y-3">
            {reviews.map((review, index) => (
              <li key={`${review.createdAt}-${index}`} className="rounded-xl border border-border p-4">
                <p className="font-medium text-foreground" aria-label={`${review.rating} out of 5 stars`}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(Math.max(0, 5 - review.rating))}
                </p>
                <time
                  className="mt-1 block text-xs text-muted"
                  dateTime={new Date(review.createdAt).toISOString()}
                >
                  {new Date(review.createdAt).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                {review.comment?.trim() ? (
                  <p className="mt-2 text-sm text-muted">{review.comment.trim()}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <MarketplaceItemDetailShell listingId={params.listingId} />
    </>
  );
}
