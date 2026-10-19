"use client";

import { cn } from "@/lib/utils";
import { BookOpen, FileText, LayoutTemplate, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type ProductCoverProps = {
  src?: string | null;
  title: string;
  category?: string;
  className?: string;
  /** Tailwind aspect class, default portrait card cover. */
  aspectClassName?: string;
  /**
   * object-cover crops to fill; object-contain preserves the full image
   * (letterboxed on the branded surface). Default cover for cards.
   */
  fit?: "cover" | "contain";
};

function fallbackIcon(category?: string) {
  const c = (category ?? "").toLowerCase();
  if (c.includes("prompt") || c.includes("ai")) return Sparkles;
  if (c.includes("design") || c.includes("template")) return LayoutTemplate;
  if (c.includes("software") || c.includes("developer") || c.includes("code")) return FileText;
  return BookOpen;
}

function fallbackTone(category?: string): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("prompt") || c.includes("ai")) return "from-violet-700 to-slate-900";
  if (c.includes("design") || c.includes("template")) return "from-violet-800 to-fuchsia-950";
  if (c.includes("software") || c.includes("developer")) return "from-indigo-800 to-slate-900";
  if (c.includes("course") || c.includes("training")) return "from-violet-700 to-stone-900";
  if (c.includes("creator")) return "from-violet-800 to-emerald-950";
  if (c.includes("education") || c.includes("ebook") || c.includes("book")) {
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
  className,
  aspectClassName,
}: {
  title: string;
  category?: string;
  className?: string;
  aspectClassName: string;
}) {
  const Icon = fallbackIcon(category);
  const tone = fallbackTone(category);
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
 * Root cause of blank cards: persisted Convex signed storage URLs expire — callers
 * must resolve fresh URLs via coverStorageId. This component still fails over cleanly.
 */
export function ProductCover({
  src,
  title,
  category,
  className,
  aspectClassName = "aspect-[4/5]",
  fit = "cover",
}: ProductCoverProps) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    return (
      <CoverFallback
        title={title}
        category={category}
        className={className}
        aspectClassName={aspectClassName}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/70 bg-zinc-50 dark:bg-zinc-900/40",
        aspectClassName,
        className
      )}
      data-cover-state="image"
      data-testid="product-cover-image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${title} cover`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn(
          "absolute inset-0 h-full w-full",
          fit === "contain" ? "object-contain p-1" : "object-cover"
        )}
        onError={() => {
          console.info("[marketplace-cover] image failed", { title, src });
          setBroken(true);
        }}
      />
    </div>
  );
}
