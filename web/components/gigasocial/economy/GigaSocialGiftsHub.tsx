"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { toUserFacingError } from "@/lib/errors/userMessage";
import { formatGhs } from "@/lib/gigasocial/creatorEconomy";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
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
  const sendGift = useMutation(api.gigaSocialEconomy.sendCreatorGift);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(
    async (giftType: string, credits: number) => {
      if (!hub?.creatorId || hub.isOwner) return;
      setBusy(giftType);
      setError(null);
      setMessage(null);
      try {
        await sendGift({
          sessionToken,
          creatorId: hub.creatorId,
          giftType,
          credits,
        });
        setMessage(`Sent ${giftType} gift! Thank you for supporting this creator.`);
      } catch (e) {
        setError(toUserFacingError(e, "Could not send gift. Please try again."));
      } finally {
        setBusy(null);
      }
    },
    [hub?.creatorId, hub?.isOwner, sendGift, sessionToken]
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
            : `Support @${hub.handle} with virtual gifts and tips.`}
        </p>
        {hub.isOwner && hub.monetizationUnlocked === false ? (
          <p className="mt-2 text-xs text-muted">
            Tips are open now. Affiliate, boost, and payout tools unlock at 500 fans.
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
              onClick={() => void handleSend(gift.id, gift.credits)}
              className="min-h-10"
            >
              {busy === gift.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <span aria-hidden>{gift.emoji}</span>
              )}
              <span className="ml-1">
                {gift.label} · {gift.credits} credits
              </span>
            </Button>
          ))}
        </div>
      ) : null}

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {hub.recentGifts.length > 0 ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Gift history</h3>
          <ul className="mt-3 space-y-2">
            {hub.recentGifts.map((gift, index) => (
              <li key={`${gift.createdAt}-${index}`} className="text-sm text-muted">
                <span className="font-medium text-foreground">{gift.giftType}</span> ·{" "}
                {gift.credits} credits ({formatGhs(gift.amountGhs)})
                {gift.message ? ` — "${gift.message}"` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});
