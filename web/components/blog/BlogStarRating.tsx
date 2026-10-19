"use client";

import { useBlogRating } from "@/hooks/useBlogRating";
import { formatBlogRatingLabel } from "@/lib/blog/ratingDisplay";
import { Star } from "lucide-react";
import { useId, useState } from "react";

type BlogStarRatingProps = {
  slug: string;
  className?: string;
  /** Compact header chip vs full interactive block. */
  variant?: "full" | "compact";
};

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

function StarButton({
  value,
  filled,
  labelledBy,
  disabled,
  onSelect,
  onFocusValue,
}: {
  value: number;
  filled: boolean;
  labelledBy: string;
  disabled: boolean;
  onSelect: (value: number) => void;
  onFocusValue: (value: number | null) => void;
}) {
  return (
    <button
      type="button"
      className={
        "rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 " +
        (filled ? "text-amber-500" : "text-zinc-300 hover:text-amber-400")
      }
      aria-label={`${value} star${value === 1 ? "" : "s"}`}
      aria-describedby={labelledBy}
      aria-pressed={filled}
      disabled={disabled}
      onClick={() => onSelect(value)}
      onMouseEnter={() => onFocusValue(value)}
      onMouseLeave={() => onFocusValue(null)}
      onFocus={() => onFocusValue(value)}
      onBlur={() => onFocusValue(null)}
    >
      <Star
        className="h-5 w-5"
        fill={filled ? "currentColor" : "none"}
        strokeWidth={1.75}
        aria-hidden
      />
    </button>
  );
}

/** Accessible 1–5 star rating with Convex persistence. Never invents averages. */
export function BlogStarRating({
  slug,
  className,
  variant = "full",
}: BlogStarRatingProps) {
  const labelId = useId();
  const summaryId = useId();
  const { ratingAvg, ratingCount, viewerRating, loading, pending, error, rate, hasRatings } =
    useBlogRating(slug);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? viewerRating ?? (hasRatings ? Math.round(ratingAvg) : 0);
  const summary = loading
    ? "Loading ratings…"
    : formatBlogRatingLabel(ratingAvg, ratingCount);

  if (variant === "compact") {
    return (
      <div className={className ?? "inline-flex items-center gap-1.5 text-sm text-muted"}>
        <Star className="h-3.5 w-3.5 text-amber-500" fill={hasRatings ? "currentColor" : "none"} aria-hidden />
        <span aria-live="polite">{loading ? "…" : hasRatings ? `${ratingAvg.toFixed(1)} (${ratingCount})` : "Rate"}</span>
      </div>
    );
  }

  return (
    <div className={className ?? "rounded-2xl border border-border bg-zinc-50/80 p-4"}>
      <p id={labelId} className="text-sm font-semibold text-foreground">
        Rate this article
      </p>
      <p id={summaryId} className="mt-1 text-sm text-muted" aria-live="polite">
        {summary}
        {viewerRating ? ` · You rated ${viewerRating}/5` : ""}
      </p>

      <div
        className="mt-3 flex items-center gap-0.5"
        role="group"
        aria-labelledby={labelId}
        aria-describedby={summaryId}
      >
        {STAR_VALUES.map((value) => (
          <StarButton
            key={value}
            value={value}
            filled={value <= displayValue}
            labelledBy={summaryId}
            disabled={pending || loading}
            onSelect={(next) => void rate(next)}
            onFocusValue={setHoverValue}
          />
        ))}
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          Ratings are saved once per device. You can update your score anytime.
        </p>
      )}
    </div>
  );
}
