"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { MARKETPLACE_CATEGORIES, PRODUCT_TYPES, formatGhs } from "@/lib/marketplace/catalog";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BadgeCheck, Search, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export function MarketplaceBrowseClient() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [category, setCategory] = useState<string>("");
  const [productType, setProductType] = useState<string>("");

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
    <ConvexAppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <Store className="h-4 w-4" aria-hidden />
              Digital Marketplace
            </div>
            <h1 className="page-title">Discover digital products</h1>
            <p className="mt-2 max-w-2xl text-muted">
              eBooks, templates, prompts, research, design assets, and more from verified creators.
            </p>
          </div>
          <ButtonLink href="/marketplace/sell">
            <ShoppingBag className="mr-2 h-4 w-4" aria-hidden />
            Sell on Giga3
          </ButtonLink>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, tags, descriptions…"
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
          <p className="text-center text-muted">Loading marketplace…</p>
        ) : listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
            No listings yet. Be the first creator on Giga3.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => (
              <Link
                key={item._id}
                href={`/marketplace/item/?id=${item._id}`}
                className="group rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                {item.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverImageUrl}
                    alt=""
                    className="mb-4 aspect-video w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-accent/10 text-sm text-muted">
                    {typeLabel(item.productType)}
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                    {item.title}
                  </h2>
                  <span className="shrink-0 font-bold">{formatGhs(item.priceGhs)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{item.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{item.category}</span>
                  {item.creator?.verified && (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
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
    </ConvexAppShell>
  );
}
