"use client";

import { CreatorAcademySection } from "@/components/marketplace/CreatorAcademySection";
import { ProductCover } from "@/components/marketplace/ProductCover";
import { SurfaceRecommendations } from "@/components/recommendations/SurfaceRecommendations";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatGhs } from "@/lib/marketplace/catalog";
import {
  DISCOVERY_COLLECTIONS,
  PRICE_FILTERS,
  listingMatchesCollection,
  listingMatchesPrice,
  type DiscoveryCollectionId,
} from "@/lib/marketplace/discovery";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BadgeCheck, Search, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const PAGE_SIZE = 24;

function MarketplaceBrowseInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebouncedValue(query, 300);
  const [collectionId, setCollectionId] = useState<DiscoveryCollectionId | "">("");
  const [priceFilterId, setPriceFilterId] = useState<string>("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<"newest" | "price-low" | "price-high">("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null && q !== query) setQuery(q);
    // Sync from deep links only when the URL q changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedQuery, collectionId, priceFilterId, verifiedOnly, sort]);

  // Call production-compatible args only. Server-side discovery filters land with
  // the Convex deploy from this PR; until then filter client-side so browse works.
  const listings = useQuery(api.marketplace.searchListings, {
    query: debouncedQuery || undefined,
    verifiedOnly: verifiedOnly || undefined,
    limit: 80,
  });

  const priceFilter = PRICE_FILTERS.find((p) => p.id === priceFilterId) ?? PRICE_FILTERS[0]!;

  const filteredSorted = useMemo(() => {
    if (!listings) return listings;
    const matched = listings.filter((item) => {
      if (!listingMatchesCollection(item, collectionId)) return false;
      if (!listingMatchesPrice(item.priceGhs, priceFilter.min, priceFilter.max)) return false;
      return true;
    });
    return [...matched].sort((a, b) => {
      if (sort === "price-low") return a.priceGhs - b.priceGhs;
      if (sort === "price-high") return b.priceGhs - a.priceGhs;
      const aTime = a.createdAt ?? a.updatedAt ?? 0;
      const bTime = b.createdAt ?? b.updatedAt ?? 0;
      return bTime - aTime;
    });
  }, [listings, collectionId, priceFilter.min, priceFilter.max, sort]);

  const visible = filteredSorted?.slice(0, visibleCount) ?? null;
  const hasMore = Boolean(filteredSorted && filteredSorted.length > visibleCount);

  return (
    <Container className="discover-stable document-compact px-4 py-3 pb-[calc(var(--primary-nav-offset,0px)+1rem)] sm:px-6 sm:py-4">
      <div id="marketplace-catalogue" className="mx-auto max-w-5xl scroll-mt-20 space-y-4">
        <header className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-accent sm:text-sm">
                <Store className="h-4 w-4" aria-hidden />
                Marketplace
              </p>
              <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Buy, pay, download
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/marketplace/purchases" variant="secondary" size="sm">
                My purchases
              </ButtonLink>
              <ButtonLink href="/marketplace/sell" size="sm">
                <ShoppingBag className="mr-1.5 h-4 w-4" aria-hidden />
                Sell
              </ButtonLink>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5 text-sm text-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span>
              Secure checkout with Paystack. Digital downloads unlock after verified payment.
              Prefer <strong>Verified</strong> creators — never pay sellers outside the app.
            </span>
          </div>
        </header>

        <CreatorAcademySection />

        <SurfaceRecommendations
          surface="marketplace"
          title="Suggested marketplace actions"
          limit={3}
        />

        <div className="space-y-2.5">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or description…"
              aria-label="Search marketplace"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            role="listbox"
            aria-label="Marketplace collections"
          >
            <button
              type="button"
              role="option"
              aria-selected={collectionId === ""}
              onClick={() => setCollectionId("")}
              className={`shrink-0 rounded-full border px-3 py-2 text-sm ${
                collectionId === ""
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-border bg-card text-foreground"
              }`}
            >
              All
            </button>
            {DISCOVERY_COLLECTIONS.map((col) => (
              <button
                key={col.id}
                type="button"
                role="option"
                aria-selected={collectionId === col.id}
                title={col.description}
                onClick={() => setCollectionId(col.id)}
                className={`shrink-0 rounded-full border px-3 py-2 text-sm ${
                  collectionId === col.id
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {col.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={priceFilterId}
              onChange={(e) => setPriceFilterId(e.target.value)}
              className="rounded-xl border border-border bg-card px-4 py-3"
              aria-label="Price filter"
            >
              {PRICE_FILTERS.map((p) => (
                <option key={p.id || "any"} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-xl border border-border bg-card px-4 py-3"
              aria-label="Sort"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: low → high</option>
              <option value="price-high">Price: high → low</option>
            </select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded"
              />
              Verified only
            </label>
          </div>
        </div>

        {!visible ? (
          <LoadingState label="Loading marketplace…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No products found"
            description="Try another search, collection, or price range — or browse the Creator Academy guides above."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {visible.map((item: NonNullable<typeof visible>[number]) => (
                <Link
                  key={item._id}
                  href={`/marketplace/item/${item._id}/`}
                  className="saas-card group flex flex-col overflow-hidden rounded-2xl p-2.5 sm:p-3 hover:border-emerald-600/35"
                >
                  <ProductCover
                    src={item.coverImageUrl}
                    title={item.title}
                    category={item.category}
                    className="w-full"
                    aspectClassName="aspect-[4/5]"
                  />
                  <div className="mt-2.5 flex min-h-0 flex-1 flex-col gap-1 px-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-emerald-800 dark:group-hover:text-emerald-300 sm:text-base">
                        {item.title}
                      </h2>
                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        {formatGhs(item.priceGhs)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted sm:text-sm">{item.description}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted">
                      <span className="truncate">{item.category}</span>
                      {item.creator?.verified ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                          Verified
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {hasMore ? (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Container>
  );
}

export function MarketplaceBrowseClient() {
  return (
    <ConvexAppShell>
      <Suspense fallback={<LoadingState label="Loading marketplace…" />}>
        <MarketplaceBrowseInner />
      </Suspense>
    </ConvexAppShell>
  );
}
