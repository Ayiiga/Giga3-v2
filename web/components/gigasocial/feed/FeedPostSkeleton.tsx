"use client";

import { memo } from "react";

export const FeedPostSkeleton = memo(function FeedPostSkeleton() {
  return (
    <div
      className="gigasocial-feed-skeleton saas-card rounded-[1.125rem] border border-border p-3 sm:p-4"
      aria-hidden
    >
      <div className="flex items-center gap-3">
        <div className="gigasocial-shimmer h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="gigasocial-shimmer h-3 w-28 rounded" />
          <div className="gigasocial-shimmer h-2.5 w-20 rounded" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="gigasocial-shimmer h-3 w-full rounded" />
        <div className="gigasocial-shimmer h-3 w-4/5 rounded" />
      </div>
      <div className="gigasocial-shimmer mt-3 h-36 rounded-xl sm:h-40" />
      <div className="mt-3 flex gap-2">
        <div className="gigasocial-shimmer h-11 w-16 rounded-full" />
        <div className="gigasocial-shimmer h-11 w-16 rounded-full" />
        <div className="gigasocial-shimmer h-11 w-16 rounded-full" />
      </div>
    </div>
  );
});

export const FeedSkeletonList = memo(function FeedSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading posts" aria-busy>
      {Array.from({ length: count }, (_, index) => (
        <FeedPostSkeleton key={index} />
      ))}
    </div>
  );
});
