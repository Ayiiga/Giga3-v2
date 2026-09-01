"use client";

import { MarketplaceItemClient } from "@/components/marketplace/MarketplaceItemClient";

export function MarketplaceItemDetailShell({ listingId }: { listingId: string }) {
  return <MarketplaceItemClient initialListingId={listingId} />;
}
