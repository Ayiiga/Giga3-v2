"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { formatGhs } from "@/lib/marketplace/catalog";

function CreatorProfileInner() {
  const params = useSearchParams();
  const handle = params.get("handle") ?? "";
  const profile = useQuery(api.creatorProfiles.getByHandle, { handle });
  const listings = useQuery(api.marketplace.searchListings, { limit: 40 });

  if (!handle) return <p className="text-center text-muted">Missing creator handle.</p>;
  if (profile === undefined) return <p className="text-center text-muted">Loading…</p>;
  if (!profile) return <p className="text-center text-muted">Creator not found.</p>;

  const creatorListings =
    listings?.filter((l) => l.creatorId === profile.userId) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="rounded-2xl border bg-card p-8">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{profile.displayName}</h1>
          {profile.verified && (
            <BadgeCheck className="h-6 w-6 text-emerald-600" aria-label="Verified" />
          )}
        </div>
        <p className="mt-1 text-muted">@{profile.handle}</p>
        {profile.bio && <p className="mt-4 text-foreground/90">{profile.bio}</p>}
        <p className="mt-4 text-sm text-muted">
          {profile.totalSales} sales · {formatGhs(profile.totalEarningsGhs)} earned
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Listings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {creatorListings.map((item) => (
            <Link
              key={item._id}
              href={`/marketplace/item/?id=${item._id}`}
              className="rounded-2xl border bg-card p-5 hover:shadow-md"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted line-clamp-2">{item.description}</p>
              <p className="mt-3 font-bold">{formatGhs(item.priceGhs)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function CreatorPage() {
  return (
    <ConvexAppShell>
      <div className="marketing-stable py-8 sm:py-12">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <CreatorProfileInner />
        </Suspense>
      </div>
    </ConvexAppShell>
  );
}
