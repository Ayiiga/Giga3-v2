"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type LearningImageCardProps = {
  src?: string | null;
  alt: string;
  /** Emoji / letter shown while loading or if the image fails. */
  fallbackEmoji?: string;
  aspectRatio?: "1:1" | "4:3" | "16:9";
  className?: string;
  imgClassName?: string;
  sizes?: string;
  /** Prefer lazy loading for Discover grids. */
  priority?: boolean;
};

const ASPECT: Record<NonNullable<LearningImageCardProps["aspectRatio"]>, string> = {
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
  "16:9": "aspect-video",
};

/**
 * Reusable educational image card — correct aspect ratio, lazy load,
 * meaningful alt, emoji fallback, and clear loading / error states.
 */
export function LearningImageCard({
  src,
  alt,
  fallbackEmoji = "🖼️",
  aspectRatio = "1:1",
  className,
  imgClassName,
  sizes = "(max-width: 640px) 40vw, 160px",
  priority = false,
}: LearningImageCardProps) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">(
    src ? "loading" : "error"
  );

  useEffect(() => {
    setPhase(src ? "loading" : "error");
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-[#1a233f]",
        ASPECT[aspectRatio],
        className
      )}
      data-testid="learning-image-card"
      data-phase={phase}
    >
      {src && phase !== "error" ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export + offline blob URLs
        <img
          key={src}
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "h-full w-full object-cover transition-opacity duration-200",
            phase === "ready" ? "opacity-100" : "opacity-0",
            imgClassName
          )}
          onLoad={() => setPhase("ready")}
          onError={() => setPhase("error")}
        />
      ) : null}

      {phase === "loading" ? (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-700/80 to-zinc-900/80"
          aria-hidden
          data-testid="learning-image-loading"
        />
      ) : null}

      {phase === "error" || !src ? (
        <div
          className="absolute inset-0 flex items-center justify-center text-3xl"
          role="img"
          aria-label={alt}
          data-testid="learning-image-fallback"
        >
          <span aria-hidden>{fallbackEmoji}</span>
        </div>
      ) : null}
    </div>
  );
}
