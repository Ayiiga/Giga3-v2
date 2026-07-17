"use client";

import { memo } from "react";

export const FeedPostSkeleton = memo(function FeedPostSkeleton() {
  return (
    <div className="gigasocial-feed-skeleton saas-card rounded-xl border border-border p-3 sm:p-4" aria-hidden>
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-zinc-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 w-28 rounded bg-zinc-200" />
          <div className="h-2 w-20 rounded bg-zinc-100" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-2.5 w-full rounded bg-zinc-100" />
        <div className="h-2.5 w-4/5 rounded bg-zinc-100" />
      </div>
      <div className="mt-3 h-32 rounded-lg bg-zinc-100 sm:h-36" />
      <div className="mt-3 flex gap-2">
        <div className="h-7 w-14 rounded-full bg-zinc-100" />
        <div className="h-7 w-14 rounded-full bg-zinc-100" />
        <div className="h-7 w-14 rounded-full bg-zinc-100" />
      </div>
    </div>
  );
});

export const FeedSkeletonList = memo(function FeedSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <FeedPostSkeleton key={index} />
      ))}
    </div>
  );
});
