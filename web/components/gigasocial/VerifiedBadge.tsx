"use client";

import { cn } from "@/lib/utils";
import { BadgeCheck } from "lucide-react";
import { memo } from "react";

/** Future-ready verified creator badge — hidden until `verified` is set on profile. */
export const VerifiedBadge = memo(function VerifiedBadge({
  verified = false,
  className,
  label = "Verified creator",
}: {
  verified?: boolean;
  className?: string;
  label?: string;
}) {
  if (!verified) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center text-sky-600",
        className
      )}
      title={label}
      aria-label={label}
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
});
