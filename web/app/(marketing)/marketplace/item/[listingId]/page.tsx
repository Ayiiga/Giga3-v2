import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { MarketplaceProductJsonLd } from "@/components/seo/DynamicPublicJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import { MarketplaceItemDetailShell } from "@/components/marketplace/MarketplaceItemDetailShell";
import { fetchMarketplaceListingIds, fetchMarketplaceSeoBundle } from "@/lib/seo/convexBuildFetch";
import { marketplaceItemPath } from "@/lib/seo/publicPaths";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import type { Metadata } from "next";

type PageProps = {
  params: { listingId: string };
};

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

  const creatorLabel = bundle.creator?.displayName
    ? ` by ${bundle.creator.displayName}`
    : "";

  return publicMetadata({
    path: marketplaceItemPath(params.listingId),
    title: `${bundle.listing.title}${creatorLabel}`,
    description: bundle.description,
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
      <MarketplaceProductJsonLd
        listingId={params.listingId}
        title={bundle.listing.title}
        description={bundle.description}
        priceGhs={bundle.listing.priceGhs}
        category={bundle.listing.category}
        imageUrl={bundle.listing.coverImageUrl}
        creatorName={bundle.creator?.displayName}
        reviewCount={bundle.reviewCount}
        ratingValue={bundle.ratingValue}
      />
      <ProductSeoHeader
        title={bundle.listing.title}
        description={bundle.description}
        detail={`${creatorLine} Pay with Paystack in GHS — downloads unlock only after payment.`}
        showProductNav={false}
      />
      <MarketplaceItemDetailShell listingId={params.listingId} />
    </>
  );
}
