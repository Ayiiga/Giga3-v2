import { GIGA3_VISION } from "@/lib/vision";
import { cn } from "@/lib/utils";

type VisionTaglineProps = {
  variant?: "full" | "short" | "subtle";
  className?: string;
};

/** Official product identity tagline — use on landing, auth, about, empty states. */
export function VisionTagline({ variant = "full", className }: VisionTaglineProps) {
  const text =
    variant === "short"
      ? GIGA3_VISION.shortTagline
      : variant === "subtle"
        ? GIGA3_VISION.tagline
        : GIGA3_VISION.tagline;

  if (variant === "subtle") {
    return (
      <p
        className={cn(
          "text-xs font-medium tracking-wide text-muted",
          className
        )}
        aria-label={GIGA3_VISION.tagline}
      >
        {text}
      </p>
    );
  }

  return (
    <p
      className={cn(
        "text-sm font-medium tracking-tight text-accent",
        variant === "short" && "text-xs text-muted",
        className
      )}
    >
      {text}
    </p>
  );
}
