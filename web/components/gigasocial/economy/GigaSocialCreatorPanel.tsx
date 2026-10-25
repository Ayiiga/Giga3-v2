"use client";

import { GigaSocialAwardsCentre } from "@/components/gigasocial/awards/GigaSocialAwardsCentre";
import { GigaSocialAffiliatePanel } from "@/components/gigasocial/economy/GigaSocialAffiliatePanel";
import { GigaSocialBoostPanel } from "@/components/gigasocial/economy/GigaSocialBoostPanel";
import { GigaSocialCreatorDashboard } from "@/components/gigasocial/economy/GigaSocialCreatorDashboard";
import { GigaSocialCreatorWallet } from "@/components/gigasocial/economy/GigaSocialCreatorWallet";
import { GigaSocialEarningsCentre } from "@/components/gigasocial/economy/GigaSocialEarningsCentre";
import { GigaSocialGiftsHub } from "@/components/gigasocial/economy/GigaSocialGiftsHub";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { cn } from "@/lib/utils";
import { memo, useEffect, useMemo, useState } from "react";

type CreatorTab =
  | "earnings"
  | "awards"
  | "dashboard"
  | "wallet"
  | "gifts"
  | "affiliate"
  | "boost";

export const GigaSocialCreatorPanel = memo(function GigaSocialCreatorPanel({
  sessionToken,
  initialTab,
}: {
  sessionToken: string;
  initialTab?: CreatorTab;
}) {
  const features = useGigaSocialFeatures();
  const [tab, setTab] = useState<CreatorTab>(initialTab ?? "earnings");

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const tabs = useMemo(() => {
    const items: { id: CreatorTab; label: string }[] = [
      { id: "earnings", label: "Earnings" },
      { id: "awards", label: "Awards" },
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
      <nav className="flex flex-wrap gap-1.5 pb-1" aria-label="Creator economy">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex min-h-10 min-w-[5.5rem] flex-1 items-center justify-center rounded-full border px-3 text-sm font-medium sm:flex-none sm:px-4",
              tab === id
                ? "border-violet-500/50 bg-violet-600 text-white"
                : "border-border bg-white text-muted"
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "earnings" ? <GigaSocialEarningsCentre sessionToken={sessionToken} /> : null}
      {tab === "awards" ? <GigaSocialAwardsCentre sessionToken={sessionToken} /> : null}
      {tab === "dashboard" ? (
        <GigaSocialCreatorDashboard
          sessionToken={sessionToken}
          onOpenBoost={() => setTab("boost")}
          onOpenAffiliate={() => setTab("affiliate")}
        />
      ) : null}
      {tab === "wallet" && features.enableCreatorWallet ? (
        <GigaSocialCreatorWallet sessionToken={sessionToken} />
      ) : null}
      {tab === "gifts" ? <GigaSocialGiftsHub sessionToken={sessionToken} /> : null}
      {tab === "affiliate" ? <GigaSocialAffiliatePanel sessionToken={sessionToken} /> : null}
      {tab === "boost" ? <GigaSocialBoostPanel sessionToken={sessionToken} /> : null}
    </div>
  );
});
