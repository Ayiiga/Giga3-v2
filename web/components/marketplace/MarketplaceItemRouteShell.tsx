"use client";

import { MarketplaceItemClient } from "@/components/marketplace/MarketplaceItemClient";
import { parseMarketplaceListingId } from "@/lib/marketplace/listingRoute";
import { marketplaceItemPath } from "@/lib/seo/publicPaths";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function MarketplaceItemRouteInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const search = params.toString();
  const listingId = parseMarketplaceListingId(pathname, search);
  const legacyQueryId = params.get("id")?.trim();

  useEffect(() => {
    if (!legacyQueryId || listingId) return;
    router.replace(marketplaceItemPath(legacyQueryId));
  }, [legacyQueryId, listingId, router]);

  if (legacyQueryId && !listingId) {
    return <p className="text-center text-muted">Redirecting to product…</p>;
  }

  if (!listingId) {
    return <p className="text-center text-muted">Missing listing id.</p>;
  }

  return <MarketplaceItemClient initialListingId={listingId} />;
}

/** SPA shell for /marketplace/item/* when Cloudflare rewrites to /marketplace/item/. */
export function MarketplaceItemRouteShell() {
  return (
    <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
      <MarketplaceItemRouteInner />
    </Suspense>
  );
}
