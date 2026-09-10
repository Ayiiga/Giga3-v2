"use client";

import { formatBlogViewLabel, useBlogViewStats } from "@/hooks/useBlogViewStats";
import { Eye } from "lucide-react";

type BlogViewCountProps = {
  slug: string;
  recordOnMount?: boolean;
  className?: string;
  compact?: boolean;
};

export function BlogViewCount({
  slug,
  recordOnMount = false,
  className,
  compact = false,
}: BlogViewCountProps) {
  const { viewCount, loading } = useBlogViewStats(slug, recordOnMount);

  return (
    <div className={className ?? "inline-flex items-center gap-1.5 text-sm text-muted"}>
      <Eye className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      <span aria-live="polite">
        {loading ? "Counting views…" : formatBlogViewLabel(viewCount)}
      </span>
    </div>
  );
}
