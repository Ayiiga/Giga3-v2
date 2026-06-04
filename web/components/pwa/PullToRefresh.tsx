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

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center transition-opacity duration-200",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{ height: Math.max(pullDistance, refreshing ? 56 : 0) }}
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
            transform: `scale(${0.85 + progress * 0.15}) rotate(${progress * 180}deg)`,
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

      <div
        className={cn(
          "transition-transform duration-200 ease-out",
          contentClassName
        )}
        style={{
          transform:
            pullDistance > 2 || refreshing
              ? `translate3d(0, ${refreshing ? 56 : pullDistance}px, 0)`
              : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
