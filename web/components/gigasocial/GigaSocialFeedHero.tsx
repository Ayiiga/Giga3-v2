"use client";

import { GIGA3_VISION } from "@/lib/vision";
import { Sparkles, UsersRound } from "lucide-react";

export function GigaSocialFeedHero({
  postCount,
}: {
  postCount?: number;
}) {
  return (
    <div className="gigasocial-feed-hero relative overflow-hidden rounded-2xl border border-accent/15 bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 p-5 text-white shadow-sm sm:p-6">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" aria-hidden />
      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <UsersRound className="h-5 w-5" aria-hidden />
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
              Community
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-tight sm:text-xl">
            Share, learn, and grow together
          </h2>
          <p className="mt-1 max-w-lg text-sm text-violet-100">
            Connect with creators, educators, and builders across the Giga3 ecosystem.
          </p>
          <p className="mt-3 text-xs font-medium tracking-wide text-violet-200/90">
            {GIGA3_VISION.tagline}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {typeof postCount === "number" ? `${postCount} posts loaded` : "Live feed"}
          </span>
        </div>
      </div>
    </div>
  );
}
