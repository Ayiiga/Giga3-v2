"use client";

import { Button } from "@/components/ui/Button";
import { CREATOR_CHALLENGES } from "@/lib/gigasocial/challenges";
import {
  canClaimDailyLogin,
  claimDailyLogin,
  dailyRewardMessage,
  loadDailyRewardState,
  REWARD_CATALOG,
  type DailyRewardState,
} from "@/lib/gigasocial/dailyRewards";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { triggerHaptic } from "@/lib/gigasocial/haptics";
import {
  loyaltyProgressPercent,
  nextLoyaltyLevel,
  resolveLoyaltyLevel,
} from "@/lib/gigasocial/loyaltyLevels";
import { listSocialPlugins } from "@/lib/gigasocial/plugins/registry";
import { runSocialAi } from "@/lib/gigasocial/socialAiRouter";
import { siteConfig } from "@/lib/site";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Gift, Sparkles, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useMemo, useState, useTransition } from "react";

export const GigaSocialGrowthHub = memo(function GigaSocialGrowthHub({
  sessionToken,
  xp = 0,
}: {
  sessionToken: string;
  xp?: number;
}) {
  const features = useGigaSocialFeatures();
  const referral = useQuery(
    api.platformGrowth.getReferralInfo,
    features.enableSocialReferrals ? { sessionToken } : "skip"
  );
  const [rewardState, setRewardState] = useState<DailyRewardState | null>(null);
  const [assistantTip, setAssistantTip] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRewardState(loadDailyRewardState());
  }, []);

  const loyalty = useMemo(() => resolveLoyaltyLevel(xp), [xp]);
  const nextLoyalty = useMemo(() => nextLoyaltyLevel(xp), [xp]);
  const plugins = useMemo(
    () => (features.enableSocialPlugins ? listSocialPlugins() : []),
    [features.enableSocialPlugins]
  );

  if (
    !features.enableDailyRewards &&
    !features.enableCreatorChallenges &&
    !features.enableSocialReferrals &&
    !features.enableLoyaltyLevels &&
    !features.enablePersonalAssistant &&
    !features.enableSocialPlugins
  ) {
    return null;
  }

  return (
    <div className="space-y-4">
      {features.enableLoyaltyLevels ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-accent" aria-hidden />
            Loyalty · {loyalty.label}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {nextLoyalty
              ? `${loyaltyProgressPercent(xp)}% to ${nextLoyalty.label}`
              : "Max loyalty track unlocked"}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/30">
            <div
              className="h-full rounded-full bg-violet-600"
              style={{ width: `${loyaltyProgressPercent(xp)}%` }}
            />
          </div>
          <ul className="mt-2 space-y-0.5 text-[11px] text-muted">
            {loyalty.unlocks.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {features.enableDailyRewards && rewardState ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Gift className="h-4 w-4 text-accent" aria-hidden />
            Daily rewards
          </h3>
          <p className="mt-1 text-xs text-muted">{dailyRewardMessage(rewardState)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {REWARD_CATALOG.map((reward) => (
              <span
                key={reward.id}
                className="rounded-full border border-border bg-white px-2.5 py-1 text-[10px] text-muted"
              >
                <span aria-hidden>{reward.emoji}</span> {reward.label}
              </span>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-3 min-h-10"
            disabled={!canClaimDailyLogin(rewardState)}
            onClick={() => {
              const next = claimDailyLogin(rewardState);
              setRewardState(next);
              triggerHaptic("success", features.enableHaptics);
            }}
          >
            {canClaimDailyLogin(rewardState) ? "Claim daily login" : "Claimed today"}
          </Button>
        </section>
      ) : null}

      {features.enableCreatorChallenges ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Creator challenges</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {CREATOR_CHALLENGES.map((challenge) => (
              <li
                key={challenge.id}
                className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">
                  <span aria-hidden>{challenge.emoji}</span> {challenge.title}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">{challenge.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {features.enableSocialReferrals ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-accent" aria-hidden />
            Invite friends
          </h3>
          <p className="mt-1 text-xs text-muted">
            Earn AI credits, badges, and premium templates when friends join.
          </p>
          {referral === undefined ? (
            <p className="mt-2 text-xs text-muted">Loading referral info…</p>
          ) : referral ? (
            <div className="mt-2 space-y-2 text-sm">
              <p className="text-foreground">
                Code:{" "}
                <span className="font-semibold">{referral.referralCode ?? "Generating…"}</span>
              </p>
              <p className="text-xs text-muted">
                {referral.referralCount} invites · {referral.totalRewardCredits} credit rewards
              </p>
              {referral.referralCode ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-10"
                  onClick={() => {
                    const link = `${siteConfig.url}/chat/login?ref=${referral.referralCode}`;
                    void navigator.clipboard.writeText(link).then(() => {
                      setCopied(true);
                      triggerHaptic("light", features.enableHaptics);
                      window.setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                >
                  {copied ? "Copied invite link" : "Copy invite link"}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">Sign in fully to unlock referrals.</p>
          )}
        </section>
      ) : null}

      {features.enablePersonalAssistant ? (
        <section className="saas-card rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-violet-700" aria-hidden />
            Personal AI Assistant
          </h3>
          <p className="mt-1 text-xs text-muted">
            Daily summary, posting reminders, creator advice, and community suggestions.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 min-h-10"
            disabled={pending}
            onClick={() => {
              startTransition(() => {
                void runSocialAi({
                  kind: "insight",
                  prompt: "daily creator briefing",
                }).then((result) => setAssistantTip(result.text));
              });
            }}
          >
            Get today&apos;s briefing
          </Button>
          {assistantTip ? (
            <p className="mt-2 rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-foreground">
              {assistantTip}
            </p>
          ) : null}
        </section>
      ) : null}

      {features.enableSocialPlugins && plugins.length ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Plugin tools</h3>
          <ul className="mt-2 space-y-2">
            {plugins.map((plugin) => (
              <li
                key={plugin.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{plugin.name}</p>
                  <p className="text-[11px] text-muted">{plugin.description}</p>
                </div>
                {plugin.enabled && plugin.href ? (
                  <Link
                    href={plugin.href}
                    className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium"
                  >
                    Open
                  </Link>
                ) : (
                  <span className="shrink-0 text-[10px] text-muted">Soon</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});
