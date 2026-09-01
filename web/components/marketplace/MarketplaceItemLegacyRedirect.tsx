"use client";

import { marketplaceItemPath } from "@/lib/seo/publicPaths";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Keeps legacy ?id= links working while canonical paths are path-based. */
export function MarketplaceItemLegacyRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const listingId = params.get("id")?.trim();

  useEffect(() => {
    if (!listingId) return;
    router.replace(marketplaceItemPath(listingId));
  }, [listingId, router]);

  if (!listingId) return null;
  return <p className="text-center text-muted">Redirecting to product…</p>;
}
