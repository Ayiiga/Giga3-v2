"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { formatGhs } from "@/lib/marketplace/catalog";
import { formatTimestampDateTime } from "@/lib/datetime";
import { getSessionToken } from "@/lib/auth";
import { redirectToPaystack } from "@/lib/payments/paystackService";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function MarketplaceItemInner() {
  const router = useRouter();
  const params = useSearchParams();
  const listingId = params.get("id") as Id<"marketplaceListings"> | null;
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
  const addReview = useMutation(api.marketplace.addReview);
  const initPurchase = useAction(api.paystack.initializeMarketplacePayment);

  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (listingId) void recordView({ listingId }).catch(() => undefined);
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
      router.push(`/chat/login?next=/marketplace/item/?id=${listingId}`);
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

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between gap-3">
        <ButtonLink href="/marketplace" variant="ghost" size="sm">
          ← Marketplace
        </ButtonLink>
        <ButtonLink href="/marketplace/purchases" variant="ghost" size="sm">
          My purchases
        </ButtonLink>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          {listing.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.coverImageUrl}
              alt=""
              className="mb-6 aspect-video w-full rounded-2xl object-cover"
            />
          )}
          <h1 className="text-3xl font-bold">{listing.title}</h1>
          {creator && (
            <p className="mt-2 text-muted">
              by{" "}
              <a href={`/creator/?handle=${creator.handle}`} className="text-emerald-600 underline">
                {creator.displayName}
              </a>
              {creator.verified ? " · Verified creator" : ""}
            </p>
          )}
          <p className="mt-4 whitespace-pre-wrap text-foreground/90">{listing.description}</p>
          {listing.previewText && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold">Preview</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{listing.previewText}</p>
            </div>
          )}
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
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {download?.allowed && download.url ? (
            <a
              href={download.url}
              download={download.fileName}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white"
            >
              Download
            </a>
          ) : !listing.hasFile ? (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted">
              Not available for purchase yet — the creator hasn&apos;t uploaded the file.
            </p>
          ) : (
            <Button className="mt-4 w-full" onClick={handleBuy} disabled={buying}>
              {buying ? "Redirecting…" : "Buy now"}
            </Button>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {listing.tags.map((tag: string) => (
              <span key={tag} className="rounded-full bg-accent/10 px-2.5 py-1 text-xs">
                {tag}
              </span>
            ))}
          </div>
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

export function MarketplaceItemClient() {
  return (
    <ConvexAppShell>
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <MarketplaceItemInner />
      </Suspense>
    </ConvexAppShell>
  );
}
