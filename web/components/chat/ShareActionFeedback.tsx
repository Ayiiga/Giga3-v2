"use client";

import { cn } from "@/lib/utils";
import type { ShareFeedback } from "@/hooks/useShareAction";
import { memo } from "react";

interface ShareActionFeedbackProps {
  feedback: ShareFeedback;
  className?: string;
  align?: "start" | "end";
}

/** Non-layout-shifting status line — absolute within a relative min-height row. */
export const ShareActionFeedback = memo(function ShareActionFeedback({
  feedback,
  className,
  align = "start",
}: ShareActionFeedbackProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-hidden={!feedback}
      className={cn(
        "pointer-events-none absolute bottom-full z-10 mb-1 max-w-[14rem] truncate rounded-lg px-2 py-1 text-xs font-medium shadow-sm transition-opacity",
        align === "end" ? "right-0" : "left-0",
        feedback
          ? feedback.kind === "success"
            ? "bg-emerald-600 text-white opacity-100"
            : "bg-amber-700 text-white opacity-100"
          : "opacity-0",
        className
      )}
    >
      {feedback?.message ?? ""}
    </span>
  );
});
