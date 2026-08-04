"use client";

import { CreatorAcademySection } from "@/components/marketplace/CreatorAcademySection";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { MARKETPLACE_CATEGORIES, PRODUCT_TYPES, formatGhs } from "@/lib/marketplace/catalog";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BadgeCheck, Search, ShoppingBag, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function MarketplaceBrowseInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const debouncedQuery = useDebouncedValue(query, 300);
  const [category, setCategory] = useState<string>("");
  const [productType, setProductType] = useState<string>("");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null && q !== query) setQuery(q);
    // Sync from deep links only when the URL q changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const listings = useQuery(api.marketplace.searchListings, {
    query: debouncedQuery || undefined,
    category: category || undefined,
    productType: (productType || undefined) as any,
    limit: 40,
  });

  const typeLabel = useMemo(() => {
    const map = new Map(PRODUCT_TYPES.map((t) => [t.id, t.label]));
    return (id: string) => map.get(id as any) ?? id;
  }, []);

  return (
    <Container className="discover-stable py-8 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <Store className="h-4 w-4" aria-hidden />
              Giga3 Marketplace
            </p>
            <h1 className="page-title font-serif tracking-tight">
              A professional shelf for creator products
            </h1>
            <p className="mt-3 text-muted">
              Sell eBooks, templates, prompts, and educational packs to buyers who already
              create with Giga3. Verified sellers, Paystack checkout in GHS, instant digital
              delivery.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/marketplace/purchases" variant="secondary">
              My purchases
            </ButtonLink>
            <ButtonLink href="/marketplace/sell">
              <ShoppingBag className="mr-2 h-4 w-4" aria-hidden />
              Sell on Giga3
            </ButtonLink>
          </div>
        </header>

        <CreatorAcademySection />

        <section
          className="rounded-3xl border border-border bg-card/80 px-5 py-5 sm:px-6"
          aria-label="Why creators sell here"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
            <div>
              <h2 className="font-serif text-xl text-foreground">Built for serious creators</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted">
                Identity verification, clear licensing, cover-led listings, and payout balance
                tracking — so your digital products look as professional as your GigaSocial
                brand.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, tags, descriptions…"
              aria-label="Search marketplace listings"
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
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-3"
            aria-label="Product type"
          >
            <option value="">All types</option>
            {PRODUCT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {!listings ? (
          <LoadingState label="Loading marketplace…" />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No listings found"
            description="Try a different search — or publish the first product from the creator dashboard."
          />
        ) : (
          <div className="discover-card-grid discover-card-grid--3">
            {listings.map((item: NonNullable<typeof listings>[number]) => (
              <Link
                key={item._id}
                href={`/marketplace/item/?id=${item._id}`}
                className="saas-card group block rounded-2xl p-5 hover:border-emerald-600/35"
              >
                {item.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverImageUrl}
                    alt={item.title}
                    className="mb-4 aspect-video w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-emerald-950/5 text-sm text-muted dark:bg-emerald-400/10">
                    {typeLabel(item.productType)}
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-serif text-lg font-semibold group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                    {item.title}
                  </h2>
                  <span className="shrink-0 font-bold tabular-nums">
                    {formatGhs(item.priceGhs)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{item.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{item.category}</span>
                  {item.creator?.verified && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                      Verified
                    </span>
                  )}
                  {item.ratingCount > 0 && (
                    <span>
                      ★ {item.ratingAvg.toFixed(1)} ({item.ratingCount})
                    </span>
                  )}
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
