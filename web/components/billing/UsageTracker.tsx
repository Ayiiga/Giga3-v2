"use client";

import type { UsageSnapshot } from "@/lib/credits/constants";
import { creditsLow, formatExpiry, planDisplayName } from "@/lib/credits/rules";
import { cn } from "@/lib/utils";
import { Coins, Calendar, Sparkles } from "lucide-react";

interface UsageTrackerProps {
  usage: UsageSnapshot;
  className?: string;
}

export function UsageTracker({ usage, className }: UsageTrackerProps) {
  const low = creditsLow(usage);

  return (
    <div
      className={cn(
        "glass space-y-3 rounded-xl border border-border p-4",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Account
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted">
          <Sparkles className="h-4 w-4" aria-hidden />
          Plan
        </span>
        <span className="font-medium capitalize">
          {planDisplayName(usage.subscriptionPlan)}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted">
          <Coins className="h-4 w-4" aria-hidden />
          Credits
        </span>
        <span className={cn("font-medium", low && "text-amber-300")}>
          {usage.credits}
        </span>
      </div>
      {usage.subscriptionActive && (
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted">
            <Calendar className="h-4 w-4" aria-hidden />
            Renews
          </span>
          <span className="font-medium">
            {formatExpiry(usage.subscriptionExpiresAt)}
          </span>
        </div>
      )}
      <p className="text-xs text-muted">
        Chat {usage.creditCosts.chat} · Writing {usage.creditCosts.writing} ·
        Research {usage.creditCosts.research} · Image {usage.creditCosts.image}{" "}
        · Video {usage.creditCosts.video}
      </p>
      {low && (
        <p className="text-xs text-amber-300">
          Low credits — subscribe or buy a top-up pack.
        </p>
      )}
    </div>
  );
}
