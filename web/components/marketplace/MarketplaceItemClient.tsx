"use client";

import { isBookLikeProduct, ProductCover } from "@/components/marketplace/ProductCover";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { formatGhs } from "@/lib/marketplace/catalog";
import { parseMarketplaceListingId } from "@/lib/marketplace/listingRoute";
import {
  buildPromotionalCaption,
  buildShareDestination,
  copyTextToClipboard,
} from "@/lib/marketplace/promotionalCaption";
import { marketplaceItemUrl } from "@/lib/seo/publicPaths";
import { formatTimestampDateTime } from "@/lib/datetime";
import { getSessionToken } from "@/lib/auth";
import { redirectToPaystack } from "@/lib/payments/paystackService";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { BadgeCheck, Download, Flag, Share2, ShieldCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function MarketplaceItemInner({ initialListingId }: { initialListingId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const listingId = (
    initialListingId?.trim() ||
    parseMarketplaceListingId(pathname, params.toString()) ||
    params.get("id")?.trim() ||
    ""
  ) as Id<"marketplaceListings"> | null;
  const sessionToken = getSessionToken();

  const data = useQuery(
    api.marketplace.getListing,
    listingId ? { listingId } : "skip"
  );
  const download = useQuery(
    api.marketplace.getDownloadAccess,
    listingId && sessionToken ? { sessionToken, listingId } : "skip"
  );
  const recordView = useMutation(api.marketplace.recordView);
  const recordPreviewOpen = useMutation(api.marketplace.recordPreviewOpen);
  const recordPromoClick = useMutation(api.marketplace.recordPromoClick);
  const addReview = useMutation(api.marketplace.addReview);
  const reportListing = useMutation(api.marketplace.reportListing);
  const initPurchase = useAction(api.paystack.initializeMarketplacePayment);

  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<"scam" | "copyright" | "misleading" | "other">("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [previewTracked, setPreviewTracked] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    const token = getSessionToken();
    if (!token) return;
    void recordView({ listingId, sessionToken: token }).catch(() => undefined);
  }, [listingId, recordView]);

  if (!listingId) {
    return <p className="text-center text-muted">Missing listing id.</p>;
  }
  if (!data) {
    return <p className="text-center text-muted">Loading…</p>;
  }
  if (!data.listing) {
    return <p className="text-center text-muted">Listing not found.</p>;
  }

  const { listing, creator, reviews } = data;

  async function handleBuy() {
    const token = getSessionToken();
    if (!token) {
      router.push(`/chat/login?next=${encodeURIComponent(`/marketplace/item/${listingId}/`)}`);
      return;
    }
    setBuying(true);
    setError(null);
    try {
      const init = await initPurchase({ sessionToken: token, listingId: listingId! });
      redirectToPaystack(init.authorizationUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBuying(false);
    }
  }

  async function handleReport() {
    const token = getSessionToken();
    if (!token) {
      router.push(`/chat/login?next=${encodeURIComponent(`/marketplace/item/${listingId}/`)}`);
      return;
    }
    setReporting(true);
    setReportError(null);
    setReportMessage(null);
    try {
      const result = await reportListing({
        sessionToken: token,
        listingId: listingId!,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportMessage(result.message);
      setShowReportForm(false);
      setReportDetails("");
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Could not submit report.");
    } finally {
      setReporting(false);
    }
  }

  async function handleReview() {
    const token = getSessionToken();
    if (!token) return;
    setSubmittingReview(true);
    setReviewError(null);
    setReviewMessage(null);
    try {
      await addReview({
        sessionToken: token,
        listingId: listingId!,
        rating,
        comment: comment.trim() || undefined,
      });
      setComment("");
      setReviewMessage("Thanks! Your review has been posted.");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  }

  const bookLike = isBookLikeProduct({
    category: listing.category,
    productType: listing.productType ? String(listing.productType) : null,
  });
  const hasTextPreview = Boolean(
    listing.previewText || listing.previewToc || listing.previewIntro || listing.previewUrl
  );

  return (
    <Container className="document-compact py-6 pb-[calc(var(--primary-nav-offset,0px)+1.25rem)] sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ButtonLink href="/marketplace" variant="ghost" size="sm" className="min-h-11">
          ← Marketplace
        </ButtonLink>
        <ButtonLink href="/marketplace/purchases" variant="ghost" size="sm" className="min-h-11">
          My purchases
        </ButtonLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        <div className="min-w-0">
          <div
            id="preview"
            className="mb-5"
            onMouseEnter={() => {
              if (previewTracked || !listingId) return;
              setPreviewTracked(true);
              void recordPreviewOpen({
                listingId,
                sessionToken: getSessionToken() ?? undefined,
              }).catch(() => undefined);
            }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {bookLike ? "Book cover" : "Product cover"}
            </p>
            <ProductCover
              src={listing.coverImageUrl}
              title={listing.title}
              category={listing.category}
              productType={listing.productType ? String(listing.productType) : null}
              className="w-full max-w-sm"
              aspectClassName={bookLike ? "aspect-[3/4]" : "aspect-[4/5] sm:aspect-[16/10]"}
              fit={bookLike ? "contain" : "cover"}
            />
            <p className="mt-2 text-xs text-muted">
              {listing.coverImageUrl
                ? bookLike
                  ? "Book cover for this listing. Sample pages below are author-controlled previews."
                  : "Listing cover image. Purchasing unlocks the full paid file."
                : bookLike
                  ? "Showing a title cover page until the seller uploads a custom cover image."
                  : "Cover image not available yet — the seller can upload one from Sell."}
            </p>
          </div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {listing.category}
            {listing.productType ? ` · ${String(listing.productType).replace(/_/g, " ")}` : ""}
          </p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{listing.title}</h2>
          {creator && (
            <p className="mt-2 text-muted">
              by{" "}
              <a href={`/creator/?handle=${creator.handle}`} className="text-emerald-600 underline">
                {creator.displayName}
              </a>
              {creator.verified ? (
                <span className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                  Verified seller
                </span>
              ) : null}
            </p>
          )}
          <p className="mt-4 whitespace-pre-wrap text-foreground/90 leading-relaxed">{listing.description}</p>
          {hasTextPreview ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-violet-200/60 bg-card p-4 sm:p-5 dark:border-violet-900/40">
              <h3 className="font-semibold">Inside this {bookLike ? "book" : "product"}</h3>
              <p className="text-xs text-muted">
                Author-controlled sample only — purchasing unlocks the full paid file.
              </p>
              {listing.previewToc ? (
                <div>
                  <h4 className="text-sm font-semibold">Table of contents</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{listing.previewToc}</p>
                </div>
              ) : null}
              {listing.previewIntro ? (
                <div>
                  <h4 className="text-sm font-semibold">Introduction</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{listing.previewIntro}</p>
                </div>
              ) : null}
              {listing.previewText ? (
                <div>
                  <h4 className="text-sm font-semibold">Sample pages</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{listing.previewText}</p>
                </div>
              ) : null}
              {listing.previewUrl ? (
                <a
                  href={listing.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm font-medium text-violet-700 underline dark:text-violet-300"
                >
                  Open sample file
                </a>
              ) : null}
            </div>
          ) : null}
          {listing.copyrightNotice && (
            <p className="mt-4 text-xs text-muted">© {listing.copyrightNotice}</p>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <div className="text-3xl font-bold">{formatGhs(listing.priceGhs)}</div>
          <p className="mt-1 text-sm text-muted capitalize">
            License: {listing.license.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-sm text-muted">{listing.purchaseCount} purchases</p>
          {creator?.verified ? (
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <BadgeCheck className="h-4 w-4" aria-hidden />
              Verified creator
            </p>
          ) : null}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const url = marketplaceItemUrl(listingId!);
                const caption = buildPromotionalCaption({
                  listingId: listingId!,
                  title: listing.title,
                  description: listing.description,
                  priceGhs: listing.priceGhs,
                  category: listing.category,
                  productType: listing.productType,
                });
                void copyTextToClipboard(url).then((ok) => {
                  setShareMessage(ok ? "Product link copied." : "Could not copy link.");
                });
                void recordPromoClick({
                  listingId: listingId!,
                  channel: "copy",
                  sessionToken: getSessionToken() ?? undefined,
                }).catch(() => undefined);
                void caption;
              }}
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Copy link
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                const url = marketplaceItemUrl(listingId!);
                const text = buildPromotionalCaption({
                  listingId: listingId!,
                  title: listing.title,
                  description: listing.description,
                  priceGhs: listing.priceGhs,
                  category: listing.category,
                  productType: listing.productType,
                });
                window.open(
                  buildShareDestination("whatsapp", { title: listing.title, text, url }),
                  "_blank",
                  "noopener,noreferrer"
                );
                void recordPromoClick({
                  listingId: listingId!,
                  channel: "whatsapp",
                  sessionToken: getSessionToken() ?? undefined,
                }).catch(() => undefined);
              }}
            >
              WhatsApp
            </Button>
          </div>
          {shareMessage ? <p className="mt-2 text-xs text-emerald-700">{shareMessage}</p> : null}
          {download?.allowed && download.url ? (
            <>
              <a
                href={download.url}
                download={download.fileName}
                className="mt-4 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white"
              >
                <Download className="h-4 w-4" aria-hidden />
                Download PDF
              </a>
              <p className="mt-2 text-center text-xs text-muted">
                You own this. Save the file to your device.
              </p>
            </>
          ) : !listing.hasFile ? (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted">
              Not available for purchase yet — the creator hasn&apos;t uploaded the file.
            </p>
          ) : !listing.purchaseReady ? (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted">
              Awaiting admin review — this product isn&apos;t purchasable yet.
            </p>
          ) : (
            <>
              <Button className="mt-4 w-full min-h-12" onClick={handleBuy} disabled={buying}>
                {buying ? "Redirecting to Paystack…" : "Buy with Paystack"}
              </Button>
              <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Secure GHS checkout. PDF unlocks in My purchases after payment succeeds —
                never pay outside Paystack.
              </p>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {listing.tags
              .filter((tag: string) => !tag.startsWith("giga3-series") || tag === "giga3-official-series")
              .slice(0, 6)
              .map((tag: string) => (
              <span key={tag} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs">
                {tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setShowReportForm((v) => !v)}
          >
            <Flag className="h-3.5 w-3.5" aria-hidden />
            Report listing
          </button>
          {showReportForm && (
            <div className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3 text-left">
              <label className="block text-xs font-medium" htmlFor="report-reason">
                Reason
              </label>
              <select
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as typeof reportReason)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="scam">Scam or off-platform payment</option>
                <option value="copyright">Copyright issue</option>
                <option value="misleading">Misleading description</option>
                <option value="other">Other</option>
              </select>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={2}
                placeholder="Optional details"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleReport}
                disabled={reporting}
              >
                {reporting ? "Sending…" : "Submit report"}
              </Button>
              {reportMessage && <p className="text-xs text-emerald-600">{reportMessage}</p>}
              {reportError && <p className="text-xs text-red-600">{reportError}</p>}
            </div>
          )}
        </aside>
      </div>

      {download?.allowed && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Leave a review</h2>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm" htmlFor="rating">
              Rating
            </label>
            <select
              id="rating"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="rounded-lg border border-border px-3 py-2"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} stars
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Optional comment"
            className="mt-3 w-full rounded-xl border border-border px-4 py-3"
          />
          <Button
            className="mt-3"
            variant="secondary"
            onClick={handleReview}
            disabled={submittingReview}
          >
            {submittingReview ? "Submitting…" : "Submit review"}
          </Button>
          {reviewMessage && (
            <p className="mt-3 text-sm text-emerald-600">{reviewMessage}</p>
          )}
          {reviewError && <p className="mt-3 text-sm text-red-600">{reviewError}</p>}
        </section>
      )}

      {reviews.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Reviews</h2>
          <div className="space-y-3">
            {reviews.map((review: NonNullable<typeof reviews>[number]) => (
              <article key={review._id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{"★".repeat(review.rating)}</div>
                  <time className="text-xs text-muted" dateTime={new Date(review.createdAt).toISOString()}>
                    {formatTimestampDateTime(review.createdAt)}
                  </time>
                </div>
                {review.comment && <p className="mt-2 text-sm text-muted">{review.comment}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
      </div>
    </Container>
  );
}

export function MarketplaceItemClient({ initialListingId }: { initialListingId?: string } = {}) {
  return (
    <ConvexAppShell>
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <MarketplaceItemInner initialListingId={initialListingId} />
      </Suspense>
    </ConvexAppShell>
  );
}
