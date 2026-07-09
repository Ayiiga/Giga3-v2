"use client";

import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Copy, Gift, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ReferralCard() {
  const sessionToken = getSessionToken();
  const info = useQuery(
    api.platformGrowth.getReferralInfo,
    sessionToken ? { sessionToken } : "skip"
  );
  const applyReferral = useMutation(api.platformGrowth.applyReferralCode);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!sessionToken) return null;

  const shareUrl =
    typeof window !== "undefined" && info?.referralCode
      ? `${window.location.origin}/chat/login?ref=${info.referralCode}`
      : "";

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApply() {
    if (!code.trim()) return;
    try {
      const result = await applyReferral({ sessionToken: sessionToken!, referralCode: code });
      setMessage(`Applied! You received ${result.rewardCredits} bonus credits.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not apply code");
    }
  }

  return (
    <div className="saas-card rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-accent" aria-hidden />
        <h3 className="font-semibold">Invite friends</h3>
      </div>
      <p className="mt-2 text-sm text-muted">
        Share Giga3 with friends. They get bonus credits, and you earn rewards when they join.
      </p>

      {info?.referralCode && (
        <div className="mt-4 flex gap-2">
          <input
            readOnly
            value={shareUrl}
            className="input-surface min-w-0 flex-1 text-xs"
            aria-label="Referral link"
          />
          <Button size="sm" variant="secondary" onClick={() => void handleCopy()}>
            <Copy className="h-4 w-4" aria-hidden />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden />
          {info?.referralCount ?? 0} referrals
        </span>
        <span>{info?.totalRewardCredits ?? 0} credits earned</span>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted">Have a referral code?</p>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className="input-surface min-w-0 flex-1 text-sm"
          />
          <Button size="sm" onClick={() => void handleApply()}>Apply</Button>
        </div>
        {message && <p className="mt-2 text-xs text-muted">{message}</p>}
      </div>
    </div>
  );
}
