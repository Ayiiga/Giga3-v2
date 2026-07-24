"use client";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction } from "convex/react";
import { Gift, Loader2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { toUserFacingError } from "@/lib/errors/userMessage";
import { CREATOR_TIP_CATALOG } from "@/lib/gigasocial/tipCatalog";
import { formatGhs } from "@/lib/gigasocial/creatorEconomy";
import { redirectToPaystack } from "@/lib/payments/paystackService";
import { cn } from "@/lib/utils";

function tipErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (/cannot tip yourself|cannot gift yourself/i.test(raw)) {
    return "You cannot tip yourself.";
  }
  if (/Creator not found/i.test(raw)) {
    return "Creator profile not found.";
  }
  if (/PAYSTACK|not configured|checkout/i.test(raw)) {
    return "Payment is temporarily unavailable. Please try again shortly.";
  }
  return toUserFacingError(err, "Could not start tip payment. Please try again.");
}

const QUICK_TIPS = CREATOR_TIP_CATALOG.filter((tier) =>
  ["spark", "fire", "crown"].includes(tier.id)
);

export const GigaSocialTipButton = memo(function GigaSocialTipButton({
  sessionToken,
  creatorId,
  postId,
  compact = false,
  disabled,
  /** Overlay style for placement on photos/videos. */
  onMedia = false,
}: {
  sessionToken: string;
  creatorId: string;
  postId: string;
  compact?: boolean;
  disabled?: boolean;
  onMedia?: boolean;
}) {
  const initTip = useAction(api.paystack.initializeCreatorGiftPayment);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tip = useCallback(
    async (giftType: string) => {
      setBusy(giftType);
      setError(null);
      try {
        const init = await initTip({
          sessionToken,
          creatorId,
          giftType,
          postId: postId as Id<"socialPosts">,
          message: "Thanks for creating!",
        });
        redirectToPaystack(init.authorizationUrl);
      } catch (e) {
        setError(tipErrorMessage(e));
        setBusy(null);
      }
    },
    [creatorId, initTip, postId, sessionToken]
  );

  return (
    <div
      className={cn("relative", onMedia && "gigasocial-media-tip")}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled || busy !== null}
        onClick={() => {
          setOpen((value) => !value);
          setError(null);
        }}
        className={cn(
          "inline-flex items-center font-medium",
          onMedia
            ? "min-h-11 min-w-11 flex-col justify-center gap-0.5 rounded-full bg-black/45 px-2 py-1.5 text-[10px] text-white"
            : cn(
                "rounded-full text-amber-800 hover:bg-amber-50",
                compact
                  ? "min-h-8 gap-1 px-2 py-1 text-[11px]"
                  : "min-h-9 gap-1.5 px-3 py-1.5 text-xs"
              ),
          disabled && "opacity-50"
        )}
        aria-expanded={open}
        aria-label="Tip creator"
      >
        {busy ? (
          <Loader2
            className={cn(onMedia || compact ? "h-5 w-5" : "h-4 w-4", "animate-spin")}
          />
        ) : (
          <Gift className={onMedia ? "h-5 w-5" : compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
        )}
        {onMedia ? <span>{busy ? "" : "Tip"}</span> : "Tip"}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-30 mb-1 min-w-[11rem] rounded-xl border border-border bg-white p-2 shadow-md",
            onMedia ? "bottom-full right-0" : "bottom-full left-0"
          )}
        >
          <p className="mb-1.5 text-[10px] font-medium text-muted">
            Pay with MoMo, card, or bank
          </p>
          <div className="flex flex-col gap-1">
            {QUICK_TIPS.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={busy !== null}
                onClick={() => void tip(item.id)}
                className="inline-flex min-h-8 items-center justify-between rounded-lg px-2 text-xs text-foreground hover:bg-amber-50"
              >
                <span>
                  <span aria-hidden>{item.emoji}</span> {item.label}
                </span>
                <span className="text-muted">{formatGhs(item.amountGhs)}</span>
              </button>
            ))}
          </div>
          {error ? <p className="mt-1 text-[10px] text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
});
