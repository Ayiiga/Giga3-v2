"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function StoriesOfflineBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-100",
        className
      )}
    >
      <Download className="h-3 w-3" aria-hidden />
      Available offline
    </span>
  );
}

export function StoriesOfflineUnavailable({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-6 text-center",
        className
      )}
      role="status"
    >
      <p className="text-sm font-medium text-white/90">
        This Story has not been cached yet.
      </p>
      <p className="text-xs text-white/60">
        Connect to the internet to view.
      </p>
    </div>
  );
}
