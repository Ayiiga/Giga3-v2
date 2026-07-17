"use client";

import { GIGA3_VISION } from "@/lib/vision";
import { cn } from "@/lib/utils";
import { Sparkles, UsersRound } from "lucide-react";

export function GigaSocialFeedHero({
  postCount,
  compact = false,
}: {
  postCount?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "gigasocial-feed-hero relative overflow-hidden rounded-xl border border-accent/15 bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 text-white shadow-sm",
        compact ? "p-3 sm:p-4" : "rounded-2xl p-5 sm:p-6"
      )}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" aria-hidden />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <UsersRound className="h-4 w-4" aria-hidden />
            </span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium sm:text-xs">
              Community
            </span>
          </div>
          <h2 className="mt-2 text-base font-semibold tracking-tight sm:text-lg">
            Share, learn, and grow together
          </h2>
          {!compact ? (
            <>
              <p className="mt-1 max-w-lg text-sm text-violet-100">
                Connect with creators, educators, and builders across the Giga3 ecosystem.
              </p>
              <p className="mt-2 text-xs font-medium tracking-wide text-violet-200/90">
                {GIGA3_VISION.tagline}
              </p>
            </>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium sm:text-xs">
          <Sparkles className="h-3 w-3" aria-hidden />
          {typeof postCount === "number" ? `${postCount} posts` : "Live feed"}
        </span>
      </div>
    </div>
  );
}
