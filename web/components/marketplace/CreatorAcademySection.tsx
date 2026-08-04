"use client";

import {
  CREATOR_SERIES,
  CREATOR_SERIES_PRICE_GHS,
  formatSeriesPriceGhs,
} from "@/lib/marketplace/creatorSeries";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";

export function CreatorAcademySection() {
  const official = useQuery(api.marketplaceSeed.listOfficialCreatorSeries);

  return (
    <section
      className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-[#042f2e] text-emerald-50"
      aria-labelledby="creator-academy-heading"
    >
      <div
        className="relative px-6 py-8 sm:px-8 sm:py-10"
        style={{
          background:
            "linear-gradient(135deg, #0f766e 0%, #042f2e 55%, #115e59 100%)",
        }}
      >
        <div className="relative max-w-3xl">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200">
            <GraduationCap className="h-4 w-4" aria-hidden />
            Giga3 Creator Academy
          </p>
          <h2
            id="creator-academy-heading"
            className="mt-3 font-serif text-3xl tracking-tight text-white sm:text-4xl"
          >
            Everything about the Giga3 AI PWA — in four series
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-100/90 sm:text-base">
            Official educational eBooks for creators: foundations, create &amp; publish,
            GigaSocial growth, and monetization. Each series is{" "}
            <span className="font-semibold text-white">
              {formatSeriesPriceGhs(CREATOR_SERIES_PRICE_GHS)}
            </span>
            .
          </p>
        </div>
      </div>

      <div className="grid gap-0 border-t border-white/10 sm:grid-cols-2">
        {(official ?? CREATOR_SERIES.map((s) => ({
          listingTag: s.listingTag,
          title: s.title,
          description: s.description,
          previewText: s.previewText,
          category: s.category,
          priceGhs: CREATOR_SERIES_PRICE_GHS,
          pdfPath: s.pdfPath,
          coverPath: s.coverPath,
          listing: null,
        }))).map((series, index) => {
          const meta = CREATOR_SERIES[index] ?? CREATOR_SERIES[0];
          const listingId = series.listing?._id;
          const href = listingId
            ? `/marketplace/item/?id=${listingId}`
            : `/marketplace/?q=${encodeURIComponent(series.listingTag)}`;

          return (
            <article
              key={series.listingTag}
              className="border-b border-white/10 p-5 last:border-b-0 sm:border-b-0 sm:odd:border-r sm:[&:nth-child(-n+2)]:border-b"
            >
              <div className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={series.coverPath || meta.coverPath}
                  alt=""
                  className="h-24 w-40 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-300/90">
                    Series {meta.seriesNumber} · {series.category}
                  </p>
                  <h3 className="mt-1 font-serif text-lg leading-snug text-white">
                    {meta.subtitle}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-emerald-100/80">
                    {series.previewText || series.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-white">
                      {formatSeriesPriceGhs(series.priceGhs)}
                    </span>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-emerald-950"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden />
                      {listingId ? "Buy series" : "View series"}
                    </Link>
                    <span className="text-xs text-emerald-200/80">
                      PDF delivery after Paystack purchase
                    </span>
                  </div>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {meta.topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-md bg-white/10 px-2 py-1 text-xs text-emerald-50"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
