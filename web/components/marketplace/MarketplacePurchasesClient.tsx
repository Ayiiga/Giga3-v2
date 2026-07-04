"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { formatGhs } from "@/lib/marketplace/catalog";
import { formatTimestampDateTime } from "@/lib/datetime";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Download, ShoppingBag } from "lucide-react";
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
            <p className="mt-2 text-muted">Download the digital products you have purchased.</p>
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
            {purchases.map(
              (row: NonNullable<typeof purchases>[number]) => (
                <article
                  key={row.purchase._id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/marketplace/item/?id=${row.listing._id}`}
                      className="font-semibold hover:text-emerald-700 dark:hover:text-emerald-300"
                    >
                      {row.listing.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {formatGhs(row.purchase.amountGhs)} ·{" "}
                      {formatTimestampDateTime(row.purchase.createdAt)} ·{" "}
                      <span className="capitalize">
                        {row.purchase.license.replace(/_/g, " ")} license
                      </span>
                    </p>
                  </div>
                  <ButtonLink
                    href={`/marketplace/item/?id=${row.listing._id}`}
                    variant="secondary"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden />
                    Download
                  </ButtonLink>
                </article>
              )
            )}
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
