"use client";

import { ProductCover } from "@/components/marketplace/ProductCover";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatGhs } from "@/lib/marketplace/catalog";
import { formatTimestampDateTime } from "@/lib/datetime";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
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
  const refundRequests = useQuery(
    api.marketplaceRefundRequests.myRefundRequests,
    sessionToken ? { sessionToken } : "skip"
  );
  const requestRefund = useMutation(api.marketplaceRefundRequests.requestRefund);
  const [refundFor, setRefundFor] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState<"duplicate_charge" | "file_unavailable" | "not_as_described" | "other">("file_unavailable");
  const [refundDetails, setRefundDetails] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundNotice, setRefundNotice] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

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
              const refundCase = refundRequests?.find(request => request.purchaseId === row.purchase._id);
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
                    {refundCase ? (
                      <p className="w-full rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        Refund case: {refundCase.status.replace(/_/g, " ")}. This is not confirmation of money refunded.
                        {refundCase.adminNote ? ` · Review: ${refundCase.adminNote}` : ""}
                      </p>
                    ) : (
                      <Button type="button" variant="secondary" size="sm"
                        onClick={() => { setRefundFor(refundFor === row.purchase._id ? null : row.purchase._id);
                          setRefundNotice(null); setRefundError(null); }}>
                        Request refund review
                      </Button>
                    )}
                    {refundFor === row.purchase._id && !refundCase ? (
                      <div className="w-full space-y-2 rounded-xl border border-border bg-background p-3">
                        <p className="text-xs text-muted">
                          Submit a review request for this paid digital product. Approval is not guaranteed;
                          refunds are processed separately through Paystack where applicable.
                        </p>
                        <select aria-label="Reason for refund" value={refundReason}
                          onChange={e => setRefundReason(e.target.value as typeof refundReason)}
                          className="w-full rounded-xl border px-3 py-2 text-sm">
                          <option value="file_unavailable">Paid file unavailable</option>
                          <option value="duplicate_charge">Duplicate charge</option>
                          <option value="not_as_described">Product not as described</option>
                          <option value="other">Other issue</option>
                        </select>
                        <textarea aria-label="Refund reason details" rows={3} maxLength={1000}
                          value={refundDetails} onChange={e => setRefundDetails(e.target.value)}
                          placeholder="Explain the issue (at least 10 characters)"
                          className="w-full rounded-xl border px-3 py-2 text-sm"/>
                        <Button size="sm" disabled={refundBusy || refundDetails.trim().length < 10}
                          onClick={() => {
                            if (!sessionToken) return;
                            setRefundBusy(true); setRefundError(null); setRefundNotice(null);
                            void requestRefund({
                              sessionToken, purchaseId: row.purchase._id,
                              reason: refundReason, details: refundDetails,
                            }).then(result => {
                              setRefundNotice(result.message);
                              setRefundFor(null); setRefundDetails("");
                            }).catch(err => setRefundError(err instanceof Error ? err.message : "Could not submit refund request."))
                            .finally(() => setRefundBusy(false));
                          }}>
                          {refundBusy ? "Submitting…" : "Submit for review"}
                        </Button>
                        {refundError ? <p role="alert" className="text-xs text-red-600">{refundError}</p> : null}
                      </div>
                    ) : null}
                    {refundNotice ? <p className="w-full text-xs text-emerald-700" role="status">{refundNotice}</p> : null}
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
