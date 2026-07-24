"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { toUserFacingError } from "@/lib/errors/userMessage";
import { formatGhs } from "@/lib/gigasocial/creatorEconomy";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { Gift, Loader2 } from "lucide-react";
import { memo, useCallback, useState } from "react";

export const GigaSocialGiftsHub = memo(function GigaSocialGiftsHub({
  sessionToken,
  creatorId,
}: {
  sessionToken: string;
  creatorId?: string;
}) {
  const hub = useQuery(api.gigaSocialEconomy.getGiftsHub, {
    sessionToken,
    creatorId,
  });
  const initTip = useAction(api.paystack.initializeCreatorGiftPayment);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(
    async (giftType: string) => {
      if (!hub?.creatorId || hub.isOwner) return;
      setBusy(giftType);
      setError(null);
      try {
        const init = await initTip({
          sessionToken,
          creatorId: hub.creatorId,
          giftType,
          message: "Thanks for creating!",
        });
        window.location.href = init.authorizationUrl;
      } catch (e) {
        setError(toUserFacingError(e, "Could not start tip payment. Please try again."));
        setBusy(null);
      }
    },
    [hub?.creatorId, hub?.isOwner, initTip, sessionToken]
  );

  if (hub === undefined) {
    return <LoadingState label="Loading gifts hub…" />;
  }

  if (!hub) {
    return <p className="text-sm text-muted">Gifts hub unavailable.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="saas-card rounded-2xl border border-border p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Gift className="h-5 w-5 text-accent" aria-hidden />
          Gifts Hub
        </h2>
        <p className="mt-1 text-sm text-muted">
          {hub.isOwner
            ? `You've received ${hub.totalGifts} gifts (${formatGhs(hub.totalEarningsGhs)}).`
            : `Support @${hub.handle} with Paystack — mobile money, card, or bank.`}
        </p>
        {hub.isOwner && hub.monetizationUnlocked === false ? (
          <p className="mt-2 text-xs text-muted">
            Tips and ad boosts are open now. Affiliate and payout tools unlock at 500 fans.
          </p>
        ) : null}
      </div>

      {!hub.isOwner ? (
        <div className="flex flex-wrap gap-2">
          {hub.giftCatalog.map((gift) => (
            <Button
              key={gift.id}
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void handleSend(gift.id)}
              className="min-h-10"
            >
              {busy === gift.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <span aria-hidden>{gift.emoji}</span>
              )}
              <span className="ml-1">
                {gift.label} · {formatGhs(gift.amountGhs ?? gift.credits)}
              </span>
            </Button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {hub.recentGifts.length > 0 ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Gift history</h3>
          <ul className="mt-3 space-y-2">
            {hub.recentGifts.map((gift, index) => (
              <li key={`${gift.createdAt}-${index}`} className="text-sm text-muted">
                <span className="font-medium text-foreground">{gift.giftType}</span> ·{" "}
                {formatGhs(gift.amountGhs)}
                {gift.message ? ` — "${gift.message}"` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});
