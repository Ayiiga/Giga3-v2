"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "gigasocial-skeleton-bone animate-pulse rounded-lg bg-muted/25",
        className
      )}
      aria-hidden
    />
  );
}

export const CommunitySkeleton = memo(function CommunitySkeleton({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Loading communities" aria-busy>
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="saas-card rounded-2xl border border-border p-4">
          <Bone className="h-5 w-2/3" />
          <Bone className="mt-2 h-3 w-1/3" />
          <Bone className="mt-3 h-12 w-full" />
          <Bone className="mt-4 h-9 w-24 rounded-full" />
        </li>
      ))}
    </ul>
  );
});

export const ProfileSkeleton = memo(function ProfileSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading profile" aria-busy>
      <div className="saas-card flex gap-3 rounded-2xl border border-border p-4">
        <Bone className="h-16 w-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-5 w-40" />
          <Bone className="h-3 w-24" />
          <Bone className="h-12 w-full" />
        </div>
      </div>
      <Bone className="h-24 w-full rounded-2xl" />
    </div>
  );
});

export const NotificationsSkeleton = memo(function NotificationsSkeleton({
  count = 5,
}: {
  count?: number;
}) {
  return (
    <ul className="space-y-2" aria-label="Loading notifications" aria-busy>
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="saas-card rounded-xl border border-border px-4 py-3">
          <Bone className="h-4 w-4/5" />
          <Bone className="mt-2 h-3 w-20" />
        </li>
      ))}
    </ul>
  );
});

export const CreatorDashboardSkeleton = memo(function CreatorDashboardSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading creator dashboard" aria-busy>
      <Bone className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Bone key={index} className="h-16 rounded-xl" />
        ))}
      </div>
      <Bone className="h-40 w-full rounded-2xl" />
    </div>
  );
});

export const CommentSkeleton = memo(function CommentSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-2" aria-label="Loading comments" aria-busy>
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="flex gap-2">
          <Bone className="h-8 w-8 shrink-0 rounded-full" />
          <Bone className="h-12 flex-1 rounded-xl" />
        </li>
      ))}
    </ul>
  );
});

export const SearchSkeleton = memo(function SearchSkeleton() {
  return (
    <div className="space-y-2" aria-label="Loading search" aria-busy>
      <Bone className="h-10 w-full rounded-full" />
      <Bone className="h-16 w-full rounded-xl" />
      <Bone className="h-16 w-full rounded-xl" />
    </div>
  );
});
