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
  const [offset, setOffset] = useState(0);
  const [accumulated, setAccumulated] = useState<
    Array<{
      _id: string;
      title: string;
      description: string;
      category: string;
      priceGhs: number;
      coverImageUrl?: string | null;
      createdAt?: number;
      updatedAt?: number;
      creator?: { verified?: boolean; displayName?: string; handle?: string } | null;
    }> | null
  >(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null && q !== query) setQuery(q);
    // Sync from deep links only when the URL q changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const collection = DISCOVERY_COLLECTIONS.find((c) => c.id === collectionId);
  const priceFilter = PRICE_FILTERS.find((p) => p.id === priceFilterId) ?? PRICE_FILTERS[0]!;

  // Reset pagination when filters change.
  useEffect(() => {
    setOffset(0);
    setAccumulated(null);
  }, [debouncedQuery, collectionId, priceFilterId, verifiedOnly]);

  const page = useQuery(api.marketplace.searchListings, {
    query: debouncedQuery || undefined,
    categoriesAny: collection?.categories,
    productTypesAny: collection?.productTypes,
    minPriceGhs: priceFilter.min,
    maxPriceGhs: priceFilter.max,
    verifiedOnly: verifiedOnly || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  useEffect(() => {
    if (!page) return;
    setAccumulated((prev) => {
      if (offset === 0 || !prev) return page;
      const seen = new Set(prev.map((item) => item._id));
      return [...prev, ...page.filter((item) => !seen.has(item._id))];
    });
  }, [page, offset]);

  const sortedListings = useMemo(() => {
    if (!accumulated) return accumulated;
    return [...accumulated].sort((a, b) => {
      if (sort === "price-low") return a.priceGhs - b.priceGhs;
      if (sort === "price-high") return b.priceGhs - a.priceGhs;
      const aTime = a.createdAt ?? a.updatedAt ?? 0;
      const bTime = b.createdAt ?? b.updatedAt ?? 0;
      return bTime - aTime;
    });
  }, [accumulated, sort]);

  // Keep "Load more" visible while the next page is in flight.
  const hasMore =
    page === undefined ? offset > 0 : page.length === PAGE_SIZE;
  const loadingInitial = offset === 0 && page === undefined;

  return (
    <Container className="discover-stable document-compact py-4 pb-[calc(var(--primary-nav-offset,0px)+1rem)] sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                <Store className="h-4 w-4" aria-hidden />
                Giga3 Marketplace
              </p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Buy. Pay. Download.</h2>
              <p className="mt-1 text-sm text-muted">
                Digital guides and templates in GHS. Pay with Paystack — files unlock only after
                payment is verified.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/marketplace/purchases" variant="secondary">
                My purchases
              </ButtonLink>
              <ButtonLink href="/marketplace/sell">
                <ShoppingBag className="mr-2 h-4 w-4" aria-hidden />
                Sell
              </ButtonLink>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-800/15 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              Paystack checkout only. Never pay sellers outside the app. Prefer{" "}
              <strong>Verified</strong> creators.
            </span>
          </div>
        </header>

        <CreatorAcademySection />

        <SurfaceRecommendations
          surface="marketplace"
          title="Suggested marketplace actions"
          limit={4}
        />

        <div className="space-y-3">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or description…"
              aria-label="Search marketplace"
              className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/30"
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

        {loadingInitial ? (
          <LoadingState label="Loading marketplace…" />
        ) : !sortedListings || sortedListings.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No products found"
            description="Try another search, collection, or price range — or browse the Creator Academy guides above."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {sortedListings.map((item: NonNullable<typeof sortedListings>[number]) => (
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
                <Button
                  variant="secondary"
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  disabled={page === undefined}
                >
                  {page === undefined ? "Loading…" : "Load more"}
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
