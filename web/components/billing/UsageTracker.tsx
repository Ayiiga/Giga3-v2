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
        "glass space-y-4 rounded-2xl border border-border p-5",
        className
      )}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">
        Account
      </p>
      <div className="flex items-center justify-between text-base">
        <span className="flex items-center gap-3 text-muted">
          <Sparkles className="app-icon" aria-hidden />
          Plan
        </span>
        <span className="font-medium capitalize">
          {planDisplayName(usage.subscriptionPlan)}
        </span>
      </div>
      <div className="flex items-center justify-between text-base">
        <span className="flex items-center gap-3 text-muted">
          <Coins className="app-icon" aria-hidden />
          Credits
        </span>
        <span className={cn("font-medium", low && "text-amber-300")}>
          {usage.credits}
        </span>
      </div>
      {usage.subscriptionActive && (
        <div className="flex items-center justify-between text-base">
          <span className="flex items-center gap-3 text-muted">
            <Calendar className="app-icon" aria-hidden />
            Renews
          </span>
          <span className="font-medium">
            {formatExpiry(usage.subscriptionExpiresAt)}
          </span>
        </div>
      )}
      <p className="text-sm text-muted">
        Chat {usage.creditCosts.chat} · Writing {usage.creditCosts.writing} ·
        Research {usage.creditCosts.research} · Image {usage.creditCosts.image}{" "}
        · Video {usage.creditCosts.video}
      </p>
      {low && (
        <p className="text-sm text-amber-300">
          Low credits — subscribe or buy a top-up pack.
        </p>
      )}
    </div>
  );
}
