"use client";

import { CreatorAcademySection } from "@/components/marketplace/CreatorAcademySection";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { SIMPLE_CATEGORIES, formatGhs } from "@/lib/marketplace/catalog";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BadgeCheck, Search, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function MarketplaceBrowseInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebouncedValue(query, 300);
  const [category, setCategory] = useState<string>("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<"newest" | "price-low" | "price-high">("newest");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null && q !== query) setQuery(q);
    // Sync from deep links only when the URL q changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const listings = useQuery(api.marketplace.searchListings, {
    query: debouncedQuery || undefined,
    category: category || undefined,
    verifiedOnly: verifiedOnly || undefined,
    limit: 40,
  });

  const sortedListings = useMemo(() => {
    if (!listings) return listings;
    return [...listings].sort((a, b) => {
      if (sort === "price-low") return a.priceGhs - b.priceGhs;
      if (sort === "price-high") return b.priceGhs - a.priceGhs;
      return 0;
    });
  }, [listings, sort]);

  return (
    <Container className="discover-stable py-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                <Store className="h-4 w-4" aria-hidden />
                Giga3 Marketplace
              </p>
              <h2 className="page-title font-serif tracking-tight">Buy. Pay. Download.</h2>
              <p className="mt-2 text-muted">
                Digital guides and templates in GHS. Pay with Paystack — your file unlocks only
                after payment.
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

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search marketplace"
              className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-3"
            aria-label="Category"
          >
            <option value="">All categories</option>
            {SIMPLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
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

        {!sortedListings ? (
          <LoadingState label="Loading marketplace…" />
        ) : sortedListings.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No products found"
            description="Try another search, or browse the Creator Academy guides above."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedListings.map((item: NonNullable<typeof sortedListings>[number]) => (
              <Link
                key={item._id}
                href={`/marketplace/item/${item._id}/`}
                className="saas-card group flex gap-4 rounded-2xl p-4 hover:border-emerald-600/35"
              >
                {item.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverImageUrl}
                    alt=""
                    loading="lazy"
                    className="h-24 w-20 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-xl bg-emerald-950/5 text-[10px] font-semibold uppercase text-muted">
                    PDF
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 font-serif text-lg font-semibold group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                      {item.title}
                    </h2>
                    <span className="shrink-0 font-bold tabular-nums">{formatGhs(item.priceGhs)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{item.category}</span>
                    {item.creator?.verified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        Verified
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
