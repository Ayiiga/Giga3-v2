"use client";

import { CreditsPaystackModal } from "@/components/billing/CreditsPaystackModal";
import { CREDIT_PACK_LIST } from "@/lib/payments/creditPacksCatalog";
import { cn } from "@/lib/utils";
import { memo, useState } from "react";

interface MediaCreditsBarProps {
  credits: number | null;
  subscriptionActive?: boolean;
}

/** Credits bar shown at the top of Media Studio pages. */
export const MediaCreditsBar = memo(function MediaCreditsBar({
  credits,
  subscriptionActive = false,
}: MediaCreditsBarProps) {
  const [payOpen, setPayOpen] = useState(false);
  const balance = credits ?? 0;
  const progress = Math.max(0, Math.min(100, Math.round((balance / 100) * 100)));

  return (
    <>
      <div
        className="flex items-center justify-between gap-3 rounded-2xl border border-[#2A3441] bg-[#1A233A] p-3"
        aria-label="Media Studio credits"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">
            Credits {credits ?? "…"}
            <span className="ml-2 text-[11px] font-medium text-gray-400">
              Free 25 starter · 1 GHS = 1 credit
            </span>
          </p>
          <div
            className="mt-1.5 h-2 w-full max-w-[16rem] overflow-hidden rounded-full bg-[#0F172A]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Credit balance"
          >
            <div
              className="h-full rounded-full bg-[#EAB308] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 truncate text-[11px] text-gray-400">
            {CREDIT_PACK_LIST.map((p) => `GH₵${p.amountGhs}/${p.credits}cr`).join(" · ")}
            {subscriptionActive ? " · Subscription active" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPayOpen(true)}
          className={cn(
            "shrink-0 rounded-full bg-[#EAB308] px-4 py-2 text-xs font-bold text-black",
            "hover:bg-[#d4a017] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAB308]/60"
          )}
        >
          Buy credits
        </button>
      </div>
      <CreditsPaystackModal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        currentCredits={credits}
        onSuccess={() => setPayOpen(false)}
      />
    </>
  );
});
