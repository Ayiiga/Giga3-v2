"use client";

import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";
import { memo } from "react";

type GigaSocialGoLiveButtonProps = {
  onClick: () => void;
  className?: string;
  variant?: "header" | "hero";
  disabled?: boolean;
};

/** Static Go Live CTA — no animations (gigasocial-stable safe). */
export const GigaSocialGoLiveButton = memo(function GigaSocialGoLiveButton({
  onClick,
  className,
  variant = "header",
  disabled = false,
}: GigaSocialGoLiveButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-red-600 font-semibold text-white ring-2 ring-red-400 shadow-sm hover:bg-red-700 disabled:opacity-50",
        variant === "header" && "min-h-10 px-4 py-2 text-sm",
        variant === "hero" && "min-h-11 px-5 py-2.5 text-sm sm:text-base",
        className
      )}
      aria-label="Go live on GigaSocial"
    >
      <Radio className="h-4 w-4" aria-hidden />
      <span>Go Live</span>
    </button>
  );
});
