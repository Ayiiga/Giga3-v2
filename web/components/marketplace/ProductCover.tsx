"use client";

import { cn } from "@/lib/utils";
import { BookOpen, FileText, LayoutTemplate, Sparkles } from "lucide-react";
import { useState } from "react";

type ProductCoverProps = {
  src?: string | null;
  title: string;
  category?: string;
  className?: string;
  /** Tailwind aspect class, default portrait card cover. */
  aspectClassName?: string;
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
  if (c.includes("prompt") || c.includes("ai")) return "from-teal-700 to-slate-900";
  if (c.includes("design") || c.includes("template")) return "from-rose-700 to-orange-900";
  if (c.includes("software") || c.includes("developer")) return "from-sky-700 to-slate-900";
  if (c.includes("course") || c.includes("training")) return "from-amber-700 to-stone-900";
  if (c.includes("creator")) return "from-cyan-800 to-emerald-950";
  return "from-emerald-800 to-teal-950";
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
 * Consistent marketplace cover with meaningful fallback (no fabricated product art).
 */
export function ProductCover({
  src,
  title,
  category,
  className,
  aspectClassName = "aspect-[4/5]",
}: ProductCoverProps) {
  const [broken, setBroken] = useState(false);

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
        "relative overflow-hidden rounded-xl bg-emerald-950/5",
        aspectClassName,
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    </div>
  );
}
