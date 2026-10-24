"use client";

import { ProductCover } from "@/components/marketplace/ProductCover";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatGhs } from "@/lib/marketplace/catalog";
import { formatTimestampDateTime } from "@/lib/datetime";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Download, ExternalLink, ShoppingBag, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function MarketplacePurchasesInner() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      router.replace("/chat/login?next=/marketplace/purchases");
      return;
    }
    setSessionToken(token);
  }, [router]);

  const purchases = useQuery(
    api.marketplace.getMyPurchases,
    sessionToken ? { sessionToken } : "skip"
  );

  return (
    <Container className="document-compact py-4 pb-[calc(var(--primary-nav-offset,0px)+1.25rem)] sm:py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <ShoppingBag className="h-4 w-4" aria-hidden />
              My purchases
            </div>
            <h1 className="page-title">Your library</h1>
            <p className="mt-2 text-muted">
              Paid products unlock here. Download your file after a successful Paystack payment.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Fraud-safe: files unlock only for the signed-in buyer account.
            </p>
          </div>
          <ButtonLink href="/marketplace" variant="ghost">
            Browse marketplace
          </ButtonLink>
        </div>

        {!sessionToken || purchases === undefined ? (
          <LoadingState label="Loading your purchases…" />
        ) : purchases.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={ShoppingBag}
              title="No purchases yet"
              description="When you buy a digital product with Paystack, it appears here with a download link."
            />
            <div className="flex justify-center">
              <ButtonLink href="/marketplace">Explore the marketplace</ButtonLink>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((row: NonNullable<typeof purchases>[number]) => {
              const canDownload = Boolean(row.hasDownload && row.downloadUrl);
              const pendingReview = Boolean(row.downloadPendingReview);
              return (
                <article
                  key={row.purchase._id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <ProductCover
                      src={row.listing.coverImageUrl}
                      title={row.listing.title}
                      category={row.listing.category}
                      productType={
                        row.listing.productType
                          ? String(row.listing.productType)
                          : null
                      }
                      className="w-16 shrink-0 sm:w-20"
                      aspectClassName="aspect-[4/5]"
                      fit="contain"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/marketplace/item/${row.listing._id}/`}
                        className="font-semibold hover:text-emerald-700 dark:hover:text-emerald-300"
                      >
                        {row.listing.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        {formatGhs(row.purchase.amountGhs)} ·{" "}
                        {formatTimestampDateTime(row.purchase.createdAt)}
                      </p>
                      <p className="mt-1 text-xs capitalize text-muted">
                        {row.purchase.license.replace(/_/g, " ")} license · paid via Paystack
                      </p>
                      <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                        Status: paid
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canDownload ? (
                      <a
                        href={row.downloadUrl!}
                        download={row.fileName}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        <Download className="mr-2 h-4 w-4" aria-hidden />
                        Download PDF
                      </a>
                    ) : pendingReview ? (
                      <span className="inline-flex min-h-11 max-w-[16rem] items-center rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
                        Purchase recorded — file awaiting moderation before download unlocks.
                      </span>
                    ) : (
                      <span className="inline-flex min-h-11 max-w-[16rem] items-center rounded-xl border border-dashed border-border px-3 text-xs text-muted">
                        No downloadable file on this listing yet. Contact support if this persists.
                      </span>
                    )}
                    <ButtonLink
                      href={`/marketplace/item/${row.listing._id}/`}
                      variant="secondary"
                      size="sm"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                      Details
                    </ButtonLink>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}

export function MarketplacePurchasesClient() {
  return (
    <ConvexAppShell>
      <MarketplacePurchasesInner />
    </ConvexAppShell>
  );
}
