"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatGhs } from "@/lib/gigasocial/creatorEconomy";
import { redirectToPaystack } from "@/lib/payments/paystackService";
import { SOCIAL_BOOST_COUNTRIES } from "convex/socialBoostOptions";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { Megaphone, Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

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
  const ownPosts = useQuery(api.gigaSocialEconomy.listBoostablePosts, { sessionToken });
  const initBoost = useAction(api.paystack.initializeBoostPayment);

  const [budgetGhs, setBudgetGhs] = useState(50);
  const [durationDays, setDurationDays] = useState(7);
  const [targetId, setTargetId] = useState(postId ?? "");
  const [website, setWebsite] = useState("");
  const [audience, setAudience] = useState<"everyone" | "followers" | "new_people">("everyone");
  const [country, setCountry] = useState<"" | "GH" | "NG">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId) setTargetId(postId);
  }, [postId]);

  const durations = settings?.boostDurationDays ?? DEFAULT_DURATIONS;
  const minBudget = settings?.boostBudgetMinGhs ?? 10;
  const maxBudget = settings?.boostBudgetMaxGhs ?? 2000;
  const budget = Math.max(minBudget, Math.min(maxBudget, budgetGhs));
  const duration = durations.includes(durationDays) ? durationDays : durations[0];

  const handlePayAndLaunch = useCallback(async () => {
    if (!targetId.trim()) {
      setError("Select a post to boost.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const init = await initBoost({
        sessionToken,
        targetType: "post",
        targetId: targetId.trim(),
        budgetGhs: budget,
        durationDays: duration,
        options: { website: website.trim() || undefined, audience, country: country || undefined },
      });
      redirectToPaystack(init.authorizationUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start boost payment.");
      setBusy(false);
    }
  }, [audience, budget, country, duration, initBoost, sessionToken, targetId, website]);

  if (campaigns === undefined || settings === undefined || ownPosts === undefined) {
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
          {formatGhs(maxBudget)}. Boosts increase discovery — views, fans, or sales are not
          guaranteed.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span>Your public post</span>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground">
              <option value="">Select a post</option>
              {postId && !ownPosts.some((post) => post.postId === postId) && <option value={postId}>Post opened from the feed</option>}
              {ownPosts.map((post) => <option key={post.postId} value={post.postId}>{post.body || `Media post · ${new Date(post.createdAt).toLocaleDateString()}`}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span>Website for leads (optional)</span>
            <input type="url" value={website} maxLength={2048} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" />
            <span className="mt-1 block text-xs text-muted">A Visit website button sends people to your site.</span>
          </label>
          <label className="block text-sm">
            <span>Audience</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground">
              <option value="everyone">Everyone</option>
              <option value="followers">My followers</option>
              <option value="new_people">People who do not follow me</option>
            </select>
          </label>
          <label className="block text-sm">
            <span>Discovery location</span>
            <select value={country} onChange={(e) => setCountry(e.target.value as typeof country)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground">
              <option value="">All locations</option>
              {SOCIAL_BOOST_COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
            <span className="mt-1 block text-xs text-muted">Location uses the country people choose for their feed.</span>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Budget (GHS)</span>
            <input
              type="range"
              min={minBudget}
              max={maxBudget}
              step={1}
              value={budget}
              onChange={(e) => setBudgetGhs(Number(e.target.value))}
              className="mt-1 w-full"
            />
            <span className="font-medium text-foreground">{formatGhs(budget)}</span>
          </label>

          <label className="block text-sm">
            <span className="text-muted">Campaign duration</span>
            <select
              value={duration}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "day" : "days"}
                </option>
              ))}
            </select>
          </label>

          <p className="text-sm font-medium text-foreground">
            Total: {formatGhs(budget)} for {duration} {duration === 1 ? "day" : "days"}
          </p>

          <Button type="button" disabled={busy || !targetId.trim()} onClick={() => void handlePayAndLaunch()}>
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
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">
                  {c.targetType} · {formatGhs(c.budgetGhs)} · {c.status}
                </p>
                <p className="text-xs text-muted">
                  {c.remainingDays} days left{c.options?.country ? ` · ${SOCIAL_BOOST_COUNTRIES.find((item) => item.code === c.options?.country)?.name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});
