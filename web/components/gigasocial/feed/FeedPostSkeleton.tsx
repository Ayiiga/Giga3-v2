"use client";

import { memo } from "react";

export const FeedPostSkeleton = memo(function FeedPostSkeleton() {
  return (
    <div className="gigasocial-feed-skeleton saas-card rounded-2xl border border-border p-4" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-zinc-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-zinc-200" />
          <div className="h-2 w-24 rounded bg-zinc-100" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-zinc-100" />
        <div className="h-3 w-5/6 rounded bg-zinc-100" />
      </div>
      <div className="mt-4 h-40 rounded-xl bg-zinc-100" />
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-16 rounded-full bg-zinc-100" />
        <div className="h-8 w-16 rounded-full bg-zinc-100" />
        <div className="h-8 w-16 rounded-full bg-zinc-100" />
      </div>
    </div>
  );
});

export const FeedSkeletonList = memo(function FeedSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <FeedPostSkeleton key={index} />
      ))}
    </div>
  );
});
