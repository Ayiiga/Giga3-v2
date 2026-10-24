"use client";

import { ProductCover } from "@/components/marketplace/ProductCover";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatGhs } from "@/lib/marketplace/catalog";
import { formatTimestamp } from "@/lib/datetime";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BadgeCheck, Link2, Store } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function CreatorStorefrontInner() {
  const params = useSearchParams();
  const handle = (params.get("handle") ?? "").trim();
  const storefront = useQuery(
    api.marketplace.listPublishedByHandle,
    handle ? { handle, limit: 48 } : "skip"
  );
  const [copied, setCopied] = useState(false);

  if (!handle) {
    return (
      <EmptyState
        icon={Store}
        title="Missing creator handle"
        description="Open a storefront from a product page, or use /creator/?handle=yourname."
      />
    );
  }

  if (storefront === undefined) {
    return <LoadingState label="Loading storefront…" />;
  }

  if (!storefront.profile) {
    return (
      <EmptyState
        icon={Store}
        title="Creator not found"
        description="This handle is not linked to a public seller profile."
      />
    );
  }

  const { profile, listings } = storefront;
  const sharePath = `/creator/?handle=${encodeURIComponent(profile.handle)}`;

  async function copyShareLink() {
    try {
      const url = `${window.location.origin}${sharePath}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-[calc(var(--primary-nav-offset,0px)+1.25rem)] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ButtonLink href="/marketplace" variant="ghost" size="sm">
          ← Marketplace
        </ButtonLink>
        <button
          type="button"
          onClick={() => void copyShareLink()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          {copied ? "Link copied" : "Share storefront"}
        </button>
      </div>

      <header className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-xl font-bold text-white sm:h-20 sm:w-20"
              aria-hidden
            >
              {(profile.displayName || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {profile.displayName}
              </h1>
              {profile.verified ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <BadgeCheck className="h-5 w-5" aria-hidden />
                  Verified seller
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-muted">@{profile.handle}</p>
            {profile.bio ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {profile.bio}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-muted">
              {profile.totalSales} sales
              {profile.createdAt ? ` · joined ${formatTimestamp(profile.createdAt)}` : ""}
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="storefront-listings-heading">
        <h2 id="storefront-listings-heading" className="mb-3 text-lg font-semibold">
          Products
        </h2>
        {listings.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No published products yet"
            description="This seller has not published any purchasable listings."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {listings.map((item) => (
              <Link
                key={item._id}
                href={`/marketplace/item/${item._id}/`}
                className="saas-card flex flex-col rounded-2xl p-2.5 hover:border-emerald-600/35 sm:p-3"
              >
                <ProductCover
                  src={item.coverImageUrl}
                  title={item.title}
                  category={item.category}
                  productType={
                    item.productType ? String(item.productType) : null
                  }
                  className="w-full"
                  aspectClassName="aspect-[3/4]"
                  fit="contain"
                />
                <h3 className="mt-2 line-clamp-2 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p>
                <p className="mt-2 text-sm font-bold tabular-nums">{formatGhs(item.priceGhs)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function CreatorStorefrontClient() {
  return (
    <ConvexAppShell>
      <div className="marketing-stable py-6 sm:py-10">
        <Suspense fallback={<LoadingState label="Loading storefront…" />}>
          <CreatorStorefrontInner />
        </Suspense>
      </div>
    </ConvexAppShell>
  );
}
