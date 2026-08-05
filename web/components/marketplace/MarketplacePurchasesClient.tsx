"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
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
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <ShoppingBag className="h-4 w-4" aria-hidden />
              My purchases
            </div>
            <h1 className="page-title">Your library</h1>
            <p className="mt-2 text-muted">
              Paid products unlock here. Download your PDF after a successful Paystack payment.
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
          <p className="text-center text-muted">Loading your purchases…</p>
        ) : purchases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
            <p>You haven&apos;t purchased anything yet.</p>
            <ButtonLink href="/marketplace" className="mt-4">
              Explore the marketplace
            </ButtonLink>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((row: NonNullable<typeof purchases>[number]) => {
              const cover = row.listing.coverImageUrl;
              const canDownload = Boolean(row.hasDownload && row.downloadUrl);
              return (
                <article
                  key={row.purchase._id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="h-24 w-16 shrink-0 rounded-lg object-cover sm:h-28 sm:w-20"
                      />
                    ) : (
                      <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-950/5 text-[11px] text-muted sm:h-28 sm:w-20">
                        eBook
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/marketplace/item/?id=${row.listing._id}`}
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
                    ) : (
                      <span className="inline-flex min-h-11 items-center rounded-xl border border-dashed border-border px-3 text-xs text-muted">
                        File preparing…
                      </span>
                    )}
                    <ButtonLink
                      href={`/marketplace/item/?id=${row.listing._id}`}
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
