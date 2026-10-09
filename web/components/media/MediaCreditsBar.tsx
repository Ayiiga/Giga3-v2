"use client";

import { CreditsPaystackModal } from "@/components/billing/CreditsPaystackModal";
import { CREDIT_PACK_LIST } from "@/lib/payments/creditPacksCatalog";
import { cn } from "@/lib/utils";
import { memo, useState } from "react";

interface MediaCreditsBarProps {
  credits: number | null;
  subscriptionActive?: boolean;
  /** Optional estimate for the current generate action. */
  estimateCost?: number | null;
}

/** Credits bar shown at the top of Media Studio pages. */
export const MediaCreditsBar = memo(function MediaCreditsBar({
  credits,
  subscriptionActive = false,
  estimateCost = null,
}: MediaCreditsBarProps) {
  const [payOpen, setPayOpen] = useState(false);
  const balance = credits ?? 0;
  const remaining =
    estimateCost != null && credits != null ? Math.max(0, credits - estimateCost) : null;
  // Soft visual fill — not a hard 100-credit ceiling claim.
  const progress = Math.max(0, Math.min(100, Math.round((balance / Math.max(balance, 50)) * 100)));

  return (
    <>
      <div
        className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-3"
        aria-label="Media Studio credits"
      >
        <div className="flex items-start justify-between gap-3">
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
              aria-valuenow={balance}
              aria-valuemin={0}
              aria-valuemax={Math.max(balance, 50)}
              aria-label="Credit balance"
            >
              <div
                className="h-full rounded-full bg-[#EAB308] transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            {estimateCost != null && credits != null ? (
              <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <dt className="text-gray-400">This job</dt>
                  <dd className="font-semibold text-white">{estimateCost} cr</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Balance</dt>
                  <dd className="font-semibold text-white">{credits} cr</dd>
                </div>
                <div>
                  <dt className="text-gray-400">After</dt>
                  <dd className="font-semibold text-white">
                    {remaining != null ? `${remaining} cr` : "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-1 truncate text-[11px] text-gray-400">
                {CREDIT_PACK_LIST.map((p) => `GH₵${p.amountGhs}/${p.credits}cr`).join(" · ")}
                {subscriptionActive ? " · Subscription active" : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPayOpen(true)}
            className={cn(
              "min-h-11 shrink-0 rounded-full bg-[#EAB308] px-4 py-2 text-xs font-bold text-black",
              "hover:bg-[#d4a017] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAB308]/60"
            )}
          >
            Buy credits
          </button>
        </div>
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
