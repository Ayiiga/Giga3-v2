"use client";

import { GigaSocialAffiliatePanel } from "@/components/gigasocial/economy/GigaSocialAffiliatePanel";
import { GigaSocialBoostPanel } from "@/components/gigasocial/economy/GigaSocialBoostPanel";
import { GigaSocialCreatorDashboard } from "@/components/gigasocial/economy/GigaSocialCreatorDashboard";
import { GigaSocialGiftsHub } from "@/components/gigasocial/economy/GigaSocialGiftsHub";
import { cn } from "@/lib/utils";
import { memo, useState } from "react";

type CreatorTab = "dashboard" | "gifts" | "affiliate" | "boost";

export const GigaSocialCreatorPanel = memo(function GigaSocialCreatorPanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const [tab, setTab] = useState<CreatorTab>("dashboard");

  return (
    <div className="space-y-4">
      <nav
        className="flex gap-1 overflow-x-auto overscroll-x-contain pb-1"
        aria-label="Creator economy"
      >
        {(
          [
            ["dashboard", "Dashboard"],
            ["gifts", "Gifts Hub"],
            ["affiliate", "Affiliate"],
            ["boost", "Boost"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
              tab === id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border bg-white text-muted"
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" ? <GigaSocialCreatorDashboard sessionToken={sessionToken} /> : null}
      {tab === "gifts" ? <GigaSocialGiftsHub sessionToken={sessionToken} /> : null}
      {tab === "affiliate" ? <GigaSocialAffiliatePanel sessionToken={sessionToken} /> : null}
      {tab === "boost" ? <GigaSocialBoostPanel sessionToken={sessionToken} /> : null}
    </div>
  );
});
