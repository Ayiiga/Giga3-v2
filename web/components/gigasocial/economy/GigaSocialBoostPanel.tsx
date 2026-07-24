"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatGhs } from "@/lib/gigasocial/creatorEconomy";
import { redirectToPaystack } from "@/lib/payments/paystackService";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { Megaphone, Loader2 } from "lucide-react";
import { memo, useCallback, useState } from "react";

const DEFAULT_DURATIONS = [1, 3, 5, 7, 14, 21, 30, 60, 90];

export const GigaSocialBoostPanel = memo(function GigaSocialBoostPanel({
  sessionToken,
  postId,
}: {
  sessionToken: string;
  postId?: string;
}) {
  const settings = useQuery(api.gigaSocialEconomy.getEconomySettings, {});
  const campaigns = useQuery(api.gigaSocialEconomy.listBoostCampaigns, { sessionToken });
  const initBoost = useAction(api.paystack.initializeBoostPayment);

  const [budgetGhs, setBudgetGhs] = useState(50);
  const [durationDays, setDurationDays] = useState(7);
  const [targetId, setTargetId] = useState(postId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durations = settings?.boostDurationDays ?? DEFAULT_DURATIONS;
  const minBudget = settings?.boostBudgetMinGhs ?? 10;
  const maxBudget = settings?.boostBudgetMaxGhs ?? 2000;

  const handlePayAndLaunch = useCallback(async () => {
    if (!targetId.trim()) {
      setError("Enter a post ID to boost.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const init = await initBoost({
        sessionToken,
        targetType: "post",
        targetId: targetId.trim(),
        budgetGhs,
        durationDays,
      });
      redirectToPaystack(init.authorizationUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start boost payment.");
      setBusy(false);
    }
  }, [budgetGhs, durationDays, initBoost, sessionToken, targetId]);

  if (campaigns === undefined || settings === undefined) {
    return <LoadingState label="Loading boost campaigns…" />;
  }

  return (
    <div className="space-y-4">
      <div className="saas-card rounded-2xl border border-border p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Megaphone className="h-5 w-5 text-accent" aria-hidden />
          Boost Posts
        </h2>
        <p className="mt-1 text-sm text-muted">
          Pay with mobile money, card, or bank via Paystack. Budget {formatGhs(minBudget)}–
          {formatGhs(maxBudget)}.
        </p>

        <div className="mt-4 space-y-3">
          {!postId ? (
            <label className="block text-sm">
              <span className="text-muted">Post ID</span>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Paste post ID"
              />
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="text-muted">Budget (GHC)</span>
            <input
              type="range"
              min={minBudget}
              max={maxBudget}
              step={10}
              value={budgetGhs}
              onChange={(e) => setBudgetGhs(Number(e.target.value))}
              className="mt-1 w-full"
            />
            <span className="font-medium text-foreground">{formatGhs(budgetGhs)}</span>
          </label>

          <label className="block text-sm">
            <span className="text-muted">Duration</span>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "Day" : "Days"}
                </option>
              ))}
            </select>
          </label>

          <Button type="button" disabled={busy} onClick={() => void handlePayAndLaunch()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Pay & launch with Paystack
          </Button>
        </div>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {campaigns.campaigns.length > 0 ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Campaign dashboard</h3>
          <ul className="mt-3 space-y-2">
            {campaigns.campaigns.map((c) => (
              <li
                key={c.boostId}
                className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">
                  {c.targetType} · {formatGhs(c.budgetGhs)} · {c.status}
                </p>
                <p className="text-xs text-muted">
                  Reach {c.reach} · Impressions {c.impressions} · Engagement {c.engagement} ·{" "}
                  {c.remainingDays} days left
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});
