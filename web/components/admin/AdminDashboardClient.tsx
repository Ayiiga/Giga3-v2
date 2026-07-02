"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatGhs } from "@/lib/marketplace/catalog";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const REVENUE_LABELS: Record<string, string> = {
  subscription: "Subscriptions",
  credits: "Credit packs",
  marketplace: "Marketplace",
  video: "Video",
};

function AdminInner() {
  const params = useSearchParams();
  const adminKey = params.get("key") ?? "";
  const overview = useQuery(
    api.adminMarketplace.getAdminOverview,
    adminKey ? { adminKey } : "skip"
  );
  const setPayoutStatus = useMutation(api.adminMarketplace.setPayoutStatus);
  const setListingStatus = useMutation(api.adminMarketplace.setListingStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (!adminKey) {
    return (
      <p className="rounded-2xl border border-red-300 bg-red-50 p-6 text-center text-red-700">
        Add your admin key to the URL: <code>/admin/?key=YOUR_KEY</code>
      </p>
    );
  }

  if (overview === undefined) {
    return <p className="text-center text-muted">Loading admin dashboard…</p>;
  }

  if (overview === null) {
    return (
      <p className="rounded-2xl border border-red-300 bg-red-50 p-6 text-center text-red-700">
        Unauthorized. Check your admin key.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Admin dashboard</h1>
          <p className="mt-2 text-muted">Revenue, creator payouts, and marketplace moderation.</p>
        </div>
        <ButtonLink href={`/insights/?key=${encodeURIComponent(adminKey)}`} variant="ghost">
          Platform analytics →
        </ButtonLink>
      </div>

      {notice && (
        <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">{notice}</p>
      )}
      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted">Revenue (recent)</div>
          <div className="text-2xl font-bold">{formatGhs(overview.revenue.totalRevenueGhs)}</div>
          <div className="mt-1 text-xs text-muted">
            {overview.revenue.successfulCount} paid / {overview.revenue.sampleSize} sampled
          </div>
        </div>
        {Object.entries(overview.revenue.byType).map(([type, amount]) => (
          <div key={type} className="rounded-2xl border bg-card p-5">
            <div className="text-sm text-muted">{REVENUE_LABELS[type] ?? type}</div>
            <div className="text-2xl font-bold">{formatGhs(amount as number)}</div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending payouts</h2>
          <span className="text-sm text-muted">
            {overview.payoutTotals.pendingCount} · {formatGhs(overview.payoutTotals.pendingGhs)}
          </span>
        </div>
        {overview.pendingPayouts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted">
            No pending payouts.
          </p>
        ) : (
          <div className="space-y-3">
            {overview.pendingPayouts.map(
              (p: NonNullable<typeof overview>["pendingPayouts"][number]) => (
                <article
                  key={p._id}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{p.creatorId}</div>
                    <div className="text-sm text-muted">
                      {formatGhs(p.amountGhs)} · {p.status}
                      {p.method ? ` · ${p.method}` : ""}
                      {p.note ? ` · ${p.note}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy === p._id}
                      onClick={() =>
                        void run(
                          p._id,
                          () =>
                            setPayoutStatus({
                              adminKey,
                              payoutId: p._id as Id<"creatorPayouts">,
                              status: "paid",
                            }),
                          "Payout marked paid."
                        )
                      }
                    >
                      Mark paid
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === p._id}
                      onClick={() =>
                        void run(
                          p._id,
                          () =>
                            setPayoutStatus({
                              adminKey,
                              payoutId: p._id as Id<"creatorPayouts">,
                              status: "failed",
                            }),
                          "Payout marked failed and balance refunded."
                        )
                      }
                    >
                      Mark failed
                    </Button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Listing moderation</h2>
          <span className="text-sm text-muted">
            {overview.listingStats.published} published · {overview.listingStats.draft} draft ·{" "}
            {overview.listingStats.archived} archived ·{" "}
            {overview.listingStats.publishedWithoutFile} published w/o file
          </span>
        </div>
        <div className="space-y-3">
          {overview.listings.map(
            (l: NonNullable<typeof overview>["listings"][number]) => (
              <article
                key={l._id}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{l.title}</div>
                  <div className="text-sm text-muted">
                    {l.creatorId} · {formatGhs(l.priceGhs)} · {l.purchaseCount} sales · {l.status}
                    {l.hasFile ? "" : " · ⚠ no file"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.status !== "archived" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === l._id}
                      onClick={() =>
                        void run(
                          l._id,
                          () =>
                            setListingStatus({
                              adminKey,
                              listingId: l._id as Id<"marketplaceListings">,
                              status: "archived",
                            }),
                          "Listing archived."
                        )
                      }
                    >
                      Archive
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busy === l._id}
                      onClick={() =>
                        void run(
                          l._id,
                          () =>
                            setListingStatus({
                              adminKey,
                              listingId: l._id as Id<"marketplaceListings">,
                              status: "published",
                            }),
                          "Listing re-published."
                        )
                      }
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </article>
            )
          )}
        </div>
      </section>
    </div>
  );
}

export function AdminDashboardClient() {
  return (
    <ConvexAppShell>
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <AdminInner />
      </Suspense>
    </ConvexAppShell>
  );
}
