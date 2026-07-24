"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatGhs } from "@/lib/gigasocial/creatorEconomy";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Copy, Link2, Loader2 } from "lucide-react";
import { memo, useCallback, useState } from "react";

export const GigaSocialAffiliatePanel = memo(function GigaSocialAffiliatePanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const affiliate = useQuery(api.gigaSocialEconomy.getAffiliateDashboard, { sessionToken });
  const ensureCode = useMutation(api.gigaSocialEconomy.ensureAffiliateCode);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    setBusy(true);
    try {
      await ensureCode({ sessionToken });
    } finally {
      setBusy(false);
    }
  }, [ensureCode, sessionToken]);

  const handleCopy = useCallback(async () => {
    if (!affiliate?.affiliateLink) return;
    try {
      await navigator.clipboard.writeText(affiliate.affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [affiliate?.affiliateLink]);

  if (affiliate === undefined) {
    return <LoadingState label="Loading affiliate program…" />;
  }

  if (!affiliate) return null;

  if (!affiliate.unlocked) {
    return (
      <p className="text-sm text-muted">
        Affiliate program unlocks at 500 fans. Tips on your posts stay open meanwhile.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="saas-card rounded-2xl border border-border p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Link2 className="h-5 w-5 text-accent" aria-hidden />
          Affiliate Program
        </h2>
        <p className="mt-1 text-sm text-muted">
          Share your unique link and earn {affiliate.commissionPercent}% commission on conversions.
        </p>

        {affiliate.affiliateLink ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-white px-3 py-2 text-xs">
              {affiliate.affiliateLink}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
              <Copy className="h-4 w-4" aria-hidden />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            className="mt-4"
            disabled={busy}
            onClick={() => void handleGenerate()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Generate affiliate link
          </Button>
        )}
      </div>

      <div className="gigasocial-creator-stat-grid">
        <div className="rounded-xl border border-border bg-white px-3 py-2">
          <p className="text-xs text-muted">Clicks</p>
          <p className="text-lg font-semibold">{affiliate.clicks}</p>
        </div>
        <div className="rounded-xl border border-border bg-white px-3 py-2">
          <p className="text-xs text-muted">Conversions</p>
          <p className="text-lg font-semibold">{affiliate.conversions}</p>
        </div>
        <div className="rounded-xl border border-border bg-white px-3 py-2">
          <p className="text-xs text-muted">Earnings</p>
          <p className="text-lg font-semibold">{formatGhs(affiliate.earningsGhs)}</p>
        </div>
      </div>
    </div>
  );
});
