"use client";

import { cn } from "@/lib/utils";
import { BookOpen, FileText, LayoutTemplate, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type ProductCoverProps = {
  src?: string | null;
  title: string;
  category?: string;
  productType?: string | null;
  className?: string;
  /** Tailwind aspect class, default portrait card cover. */
  aspectClassName?: string;
  /**
   * object-cover crops to fill; object-contain preserves the full image
   * (letterboxed on the branded surface). Default cover for cards; books use contain.
   */
  fit?: "cover" | "contain";
};

function fallbackIcon(category?: string, productType?: string | null) {
  const c = `${category ?? ""} ${productType ?? ""}`.toLowerCase();
  if (c.includes("prompt") || c.includes("ai")) return Sparkles;
  if (c.includes("design") || c.includes("template")) return LayoutTemplate;
  if (c.includes("software") || c.includes("developer") || c.includes("code")) return FileText;
  return BookOpen;
}

function fallbackTone(category?: string, productType?: string | null): string {
  const c = `${category ?? ""} ${productType ?? ""}`.toLowerCase();
  if (c.includes("prompt") || c.includes("ai")) return "from-violet-700 to-slate-900";
  if (c.includes("design") || c.includes("template")) return "from-violet-800 to-fuchsia-950";
  if (c.includes("software") || c.includes("developer")) return "from-indigo-800 to-slate-900";
  if (c.includes("course") || c.includes("training")) return "from-violet-700 to-stone-900";
  if (c.includes("creator")) return "from-violet-800 to-emerald-950";
  if (
    c.includes("education") ||
    c.includes("ebook") ||
    c.includes("book") ||
    c.includes("productivity")
  ) {
    return "from-emerald-800 to-slate-900";
  }
  return "from-violet-800 to-indigo-950";
}

export function isBookLikeProduct(opts?: {
  category?: string | null;
  productType?: string | null;
}): boolean {
  const category = (opts?.category ?? "").toLowerCase();
  const productType = (opts?.productType ?? "").toLowerCase();
  return (
    productType.includes("ebook") ||
    productType.includes("book") ||
    category.includes("education") ||
    category.includes("ebook") ||
    category.includes("book")
  );
}

function CoverFallback({
  title,
  category,
  productType,
  className,
  aspectClassName,
}: {
  title: string;
  category?: string;
  productType?: string | null;
  className?: string;
  aspectClassName: string;
}) {
  const Icon = fallbackIcon(category, productType);
  const tone = fallbackTone(category, productType);
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br p-3 text-center text-white",
        aspectClassName,
        tone,
        className
      )}
      role="img"
      aria-label={`${title} cover placeholder`}
      data-cover-state="fallback"
      data-testid="product-cover-fallback"
    >
      <Icon className="mb-2 h-7 w-7 opacity-90" aria-hidden />
      <span className="line-clamp-3 text-xs font-semibold leading-snug">{title}</span>
      {category ? (
        <span className="mt-2 text-[10px] font-medium uppercase tracking-wide text-white/75">
          {category}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Consistent marketplace cover with branded fallback (no fabricated product art).
 * Root cause of blank/teal cards: persisted Convex signed storage URLs expire —
 * callers must resolve fresh URLs via coverStorageId (see resolveListingCoverUrl).
 * This component never substitutes a generated cover for a valid author image.
 */
export function ProductCover({
  src,
  title,
  category,
  productType,
  className,
  aspectClassName = "aspect-[4/5]",
  fit = "cover",
}: ProductCoverProps) {
  const [broken, setBroken] = useState(false);
  const bookLike = isBookLikeProduct({ category, productType });

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const trimmed = typeof src === "string" ? src.trim() : "";
  const displaySrc = trimmed && !broken ? trimmed : null;

  if (!displaySrc) {
    return (
      <CoverFallback
        title={title}
        category={category}
        productType={productType}
        className={className}
        aspectClassName={aspectClassName}
      />
    );
  }

  const imageFit = fit === "contain" || bookLike ? "contain" : "cover";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/70 bg-zinc-50 dark:bg-zinc-900/40",
        aspectClassName,
        className
      )}
      data-cover-state="image"
      data-testid="product-cover-image"
      data-listing-title={title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={`${title} cover`}
        loading="lazy"
        decoding="async"
        className={cn(
          "absolute inset-0 h-full w-full",
          imageFit === "contain" ? "object-contain p-1" : "object-cover"
        )}
        onError={() => {
          if (trimmed && !broken) {
            console.info("[marketplace-cover] image failed", { title, src: trimmed });
            setBroken(true);
          }
        }}
      />
    </div>
  );
}
