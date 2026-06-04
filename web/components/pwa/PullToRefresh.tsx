"use client";

import { usePullToRefreshGesture } from "@/hooks/usePullToRefreshGesture";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ReactNode, RefObject } from "react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  className?: string;
  contentClassName?: string;
  scrollRef?: RefObject<HTMLElement | null>;
  disabled?: boolean;
}

/**
 * Pull-to-refresh indicator only — does NOT translate the scroll content.
 * Translating the message list caused mobile layout shake / ghosting.
 */
export function PullToRefresh({
  children,
  onRefresh,
  className,
  contentClassName,
  scrollRef,
  disabled,
}: PullToRefreshProps) {
  const { pullDistance, refreshing, progress, ready } = usePullToRefreshGesture({
    onRefresh,
    scrollRef,
    disabled,
  });

  const showIndicator = pullDistance > 0 || refreshing;
  const indicatorHeight = refreshing ? 56 : Math.min(pullDistance, 56);

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden transition-opacity duration-150",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{ height: indicatorHeight }}
        aria-hidden={!showIndicator}
        role="status"
        aria-live="polite"
        aria-busy={refreshing}
      >
        <div
          className={cn(
            "mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white shadow-lg",
            ready && !refreshing && "border-blue-500/40"
          )}
          style={{
            opacity: 0.85 + progress * 0.15,
          }}
        >
          {refreshing ? (
            <Loader2 className="animate-spin text-blue-400" aria-hidden />
          ) : (
            <span
              className={cn(
                "block h-2.5 w-2.5 rounded-full border-2 border-muted border-t-blue-400",
                ready && "border-t-emerald-400"
              )}
            />
          )}
        </div>
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col", contentClassName)}>{children}</div>
    </div>
  );
}
