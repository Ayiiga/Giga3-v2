"use client";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Gift, Loader2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

const QUICK_TIPS = [
  { id: "spark", label: "Tip", emoji: "✨", credits: 5 },
  { id: "fire", label: "Fire", emoji: "🔥", credits: 10 },
  { id: "crown", label: "Crown", emoji: "👑", credits: 25 },
] as const;

export const GigaSocialTipButton = memo(function GigaSocialTipButton({
  sessionToken,
  creatorId,
  postId,
  compact = false,
  disabled,
}: {
  sessionToken: string;
  creatorId: string;
  postId: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const sendGift = useMutation(api.gigaSocialEconomy.sendCreatorGift);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tip = useCallback(
    async (giftType: string, credits: number) => {
      setBusy(giftType);
      setError(null);
      setMessage(null);
      try {
        await sendGift({
          sessionToken,
          creatorId,
          giftType,
          credits,
          postId: postId as Id<"socialPosts">,
          message: "Thanks for creating!",
        });
        setMessage("Tip sent!");
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not send tip.");
      } finally {
        setBusy(null);
      }
    },
    [creatorId, postId, sendGift, sessionToken]
  );

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || busy !== null}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center rounded-full font-medium text-amber-800 hover:bg-amber-50",
          compact ? "min-h-8 gap-1 px-2 py-1 text-[11px]" : "min-h-9 gap-1.5 px-3 py-1.5 text-xs",
          disabled && "opacity-50"
        )}
        aria-expanded={open}
        aria-label="Tip creator"
      >
        {busy ? (
          <Loader2 className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "animate-spin")} />
        ) : (
          <Gift className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
        )}
        Tip
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-1 min-w-[10rem] rounded-xl border border-border bg-white p-2 shadow-md">
          <p className="mb-1.5 text-[10px] font-medium text-muted">Support with credits</p>
          <div className="flex flex-col gap-1">
            {QUICK_TIPS.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={busy !== null}
                onClick={() => void tip(item.id, item.credits)}
                className="inline-flex min-h-8 items-center justify-between rounded-lg px-2 text-xs hover:bg-amber-50"
              >
                <span>
                  <span aria-hidden>{item.emoji}</span> {item.label}
                </span>
                <span className="text-muted">{item.credits} cr</span>
              </button>
            ))}
          </div>
          {error ? <p className="mt-1 text-[10px] text-red-700">{error}</p> : null}
          {message ? <p className="mt-1 text-[10px] text-emerald-700">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
});
