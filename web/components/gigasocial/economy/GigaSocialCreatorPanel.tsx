"use client";

import { GigaSocialAffiliatePanel } from "@/components/gigasocial/economy/GigaSocialAffiliatePanel";
import { GigaSocialBoostPanel } from "@/components/gigasocial/economy/GigaSocialBoostPanel";
import { GigaSocialCreatorDashboard } from "@/components/gigasocial/economy/GigaSocialCreatorDashboard";
import { GigaSocialCreatorWallet } from "@/components/gigasocial/economy/GigaSocialCreatorWallet";
import { GigaSocialGiftsHub } from "@/components/gigasocial/economy/GigaSocialGiftsHub";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { cn } from "@/lib/utils";
import { memo, useMemo, useState } from "react";

type CreatorTab = "dashboard" | "wallet" | "gifts" | "affiliate" | "boost";

export const GigaSocialCreatorPanel = memo(function GigaSocialCreatorPanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const features = useGigaSocialFeatures();
  const [tab, setTab] = useState<CreatorTab>("dashboard");

  const tabs = useMemo(() => {
    const items: { id: CreatorTab; label: string }[] = [
      { id: "dashboard", label: "Dashboard" },
    ];
    if (features.enableCreatorWallet) {
      items.push({ id: "wallet", label: "Wallet" });
    }
    items.push(
      { id: "gifts", label: "Gifts Hub" },
      { id: "affiliate", label: "Affiliate" },
      { id: "boost", label: "Boost" }
    );
    return items;
  }, [features.enableCreatorWallet]);

  return (
    <div className="space-y-4">
      <nav
        className="flex gap-1 overflow-x-auto overscroll-x-contain pb-1"
        aria-label="Creator economy"
      >
        {tabs.map(({ id, label }) => (
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
      {tab === "wallet" && features.enableCreatorWallet ? (
        <GigaSocialCreatorWallet sessionToken={sessionToken} />
      ) : null}
      {tab === "gifts" ? <GigaSocialGiftsHub sessionToken={sessionToken} /> : null}
      {tab === "affiliate" ? <GigaSocialAffiliatePanel sessionToken={sessionToken} /> : null}
      {tab === "boost" ? <GigaSocialBoostPanel sessionToken={sessionToken} /> : null}
    </div>
  );
});
