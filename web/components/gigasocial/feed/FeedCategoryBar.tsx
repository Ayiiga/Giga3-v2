"use client";

import { cn } from "@/lib/utils";
import { FEED_CATEGORIES, type FeedCategoryId } from "@/lib/gigasocial/feedCategories";
import { memo } from "react";

export const FeedCategoryBar = memo(function FeedCategoryBar({
  value,
  onChange,
}: {
  value: FeedCategoryId;
  onChange: (category: FeedCategoryId) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
      role="tablist"
      aria-label="Feed categories"
    >
      {FEED_CATEGORIES.map((category) => {
        const active = value === category.id;
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(category.id)}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
              active
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border bg-white text-muted hover:border-accent/25 hover:text-foreground"
            )}
          >
            <span aria-hidden>{category.emoji}</span>
            {category.label}
          </button>
        );
      })}
    </div>
  );
});
