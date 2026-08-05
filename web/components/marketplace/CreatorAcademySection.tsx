"use client";

import {
  CREATOR_SERIES,
  CREATOR_SERIES_PRICE_GHS,
  formatSeriesPriceGhs,
} from "@/lib/marketplace/creatorSeries";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BadgeCheck, BookOpen, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function CreatorAcademySection() {
  const official = useQuery(api.marketplaceSeed.listOfficialCreatorSeries);

  return (
    <section
      className="overflow-hidden rounded-3xl border border-emerald-900/15 bg-[#041f1e] text-emerald-50"
      aria-labelledby="creator-academy-heading"
    >
      <div
        className="relative px-5 py-7 sm:px-8 sm:py-9"
        style={{
          background:
            "linear-gradient(145deg, #0f766e 0%, #042f2e 52%, #0b1220 100%)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/90">
          Giga3 Creator Academy
        </p>
        <h2
          id="creator-academy-heading"
          className="mt-2 max-w-2xl font-serif text-3xl tracking-tight text-white sm:text-4xl"
        >
          Four official eBooks. One clear price.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-100/90 sm:text-base">
          Learn the PWA, create &amp; publish, grow on GigaSocial, and monetize —{" "}
          <span className="font-semibold text-white">
            {formatSeriesPriceGhs(CREATOR_SERIES_PRICE_GHS)}
          </span>{" "}
          each. Pay with Paystack, then download your PDF instantly.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-emerald-50/95">
          <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Paystack checkout
          </li>
          <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Official verified seller
          </li>
          <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Download after payment only
          </li>
        </ul>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
        {(
          official ??
          CREATOR_SERIES.map((s) => ({
            listingTag: s.listingTag,
            title: s.title,
            description: s.description,
            previewText: s.previewText,
            category: s.category,
            priceGhs: CREATOR_SERIES_PRICE_GHS,
            pdfPath: s.pdfPath,
            coverPath: s.coverPath,
            listing: null,
          }))
        ).map((series, index) => {
          const meta = CREATOR_SERIES[index] ?? CREATOR_SERIES[0]!;
          const listingId = series.listing?._id;
          const href = listingId
            ? `/marketplace/item/?id=${listingId}`
            : `/marketplace/?q=${encodeURIComponent(series.listingTag)}`;
          // Prefer refreshed public Academy covers over older seeded storage URLs.
          const cover =
            meta.coverPath || series.listing?.coverImageUrl || series.coverPath;

          return (
            <article
              key={series.listingTag}
              className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={`Series ${meta.seriesNumber} cover — ${meta.subtitle}`}
                className="aspect-[3/4] w-full object-cover sm:aspect-[16/10]"
              />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/90">
                    Series {meta.seriesNumber} · {series.category}
                  </p>
                  <h3 className="mt-1 font-serif text-xl leading-snug text-white">
                    {meta.subtitle}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-emerald-100/75">
                    {series.previewText || series.description}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                  <span className="text-base font-bold tabular-nums text-white">
                    {formatSeriesPriceGhs(series.priceGhs)}
                  </span>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-950"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden />
                    {listingId ? "Buy / open" : "View"}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
