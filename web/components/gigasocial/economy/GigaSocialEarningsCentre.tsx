"use client";

import { GigaSocialMonetizationAccept } from "@/components/gigasocial/economy/GigaSocialMonetizationAccept";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  annualTargetBreakdown,
  computeGoalProgress,
  DEFAULT_ANNUAL_ASPIRATION_GHS,
  sumScenarioAnnual,
} from "@/lib/gigasocial/creatorEarnings/annualGoalPlanner";
import { CREATOR_EARNINGS_GUIDE } from "@/lib/gigasocial/creatorEarnings/creatorEarningsGuide";
import {
  availabilityLabel,
  EARNING_SOURCES,
} from "@/lib/gigasocial/creatorEarnings/earningSources";
import {
  deriveMonetizationStatus,
  eligibilityChecklist,
  MONETIZATION_STATUS_COPY,
} from "@/lib/gigasocial/creatorEarnings/monetizationStatus";
import {
  AWARD_CATEGORIES,
  isRewardClaimable,
  REWARD_CATALOGUE,
} from "@/lib/gigasocial/creatorEarnings/rewardCatalogue";
import {
  fanProgressPercent,
  fansRemaining,
  formatGhs,
} from "@/lib/gigasocial/creatorEconomy";
import { FAN_LABELS } from "@/lib/gigasocial/fanBranding";
import { formatCompactCount } from "@/lib/gigasocial/ogMeta";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  BookOpen,
  Flag,
  Gift,
  Info,
  Target,
  Wallet,
} from "lucide-react";
import { memo, useMemo, useState } from "react";

type CentreTab = "overview" | "sources" | "rewards" | "goal" | "guide";

export const GigaSocialEarningsCentre = memo(function GigaSocialEarningsCentre({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const dashboard = useQuery(api.gigaSocialEconomy.getCreatorDashboard, { sessionToken });
  const submitApplication = useMutation(api.gigaSocialEconomy.submitMonetizationApplication);
  const submitAppeal = useMutation(api.gigaSocialEconomy.submitMonetizationAppeal);
  const [tab, setTab] = useState<CentreTab>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [annualTarget, setAnnualTarget] = useState(DEFAULT_ANNUAL_ASPIRATION_GHS);
  const [scenario, setScenario] = useState({
    tips: 0,
    marketplace: 0,
    affiliate: 0,
    sponsorships: 0,
  });
  const [appealText, setAppealText] = useState("");

  const statusId = useMemo(() => {
    if (!dashboard) return "not_yet_eligible" as const;
    return deriveMonetizationStatus({
      fanEligible: Boolean(dashboard.fanEligible),
      accepted: Boolean(dashboard.monetizationAccepted),
      application: dashboard.application,
    });
  }, [dashboard]);

  const checklist = useMemo(() => {
    if (!dashboard) return [];
    return eligibilityChecklist({
      fanCount: dashboard.fanCount,
      fansRequired: dashboard.fansRequired,
      accepted: Boolean(dashboard.monetizationAccepted),
      accountStandingOk: true,
      hasSocialProfile: true,
    });
  }, [dashboard]);

  const goal = useMemo(() => {
    const ytd = dashboard?.verifiedCashEarningsGhs ?? 0;
    const start = new Date(new Date().getFullYear(), 0, 1).getTime();
    const daysElapsed = Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1);
    return computeGoalProgress({
      annualTargetGhs: annualTarget,
      verifiedYtdGhs: ytd,
      daysElapsedInPeriod: daysElapsed,
    });
  }, [annualTarget, dashboard?.verifiedCashEarningsGhs]);

  const scenarioTotals = useMemo(() => sumScenarioAnnual(scenario), [scenario]);
  const targetParts = annualTargetBreakdown(annualTarget);

  if (dashboard === undefined) {
    return <LoadingState label="Loading earnings centre…" />;
  }
  if (!dashboard) {
    return (
      <p className="text-sm text-muted">
        Set up your GigaSocial profile to open the Creator Earnings Centre.
      </p>
    );
  }

  const statusCopy = MONETIZATION_STATUS_COPY[statusId];
  const verified = dashboard.verifiedCashEarningsGhs ?? 0;
  const unfunded = dashboard.unfundedContentBonusEstimateGhs ?? dashboard.contentEarningsGhs ?? 0;
  const available = dashboard.payoutBalanceGhs ?? 0;

  const onApply = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await submitApplication({ sessionToken });
      setNotice(`Application status: ${res.status}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit application.");
    } finally {
      setBusy(false);
    }
  };

  const onAppeal = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await submitAppeal({ sessionToken, statement: appealText });
      setNotice(`Appeal status: ${res.status}.`);
      setAppealText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit appeal.");
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: CentreTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "sources", label: "Sources" },
    { id: "rewards", label: "Rewards" },
    { id: "goal", label: "GH₵100k goal" },
    { id: "guide", label: "Guide" },
  ];

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-700 via-violet-600 to-violet-900 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-100">
          GigaSocial · Creator Earnings
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Earnings, Rewards & Awards</h2>
        <p className="mt-2 max-w-xl text-sm text-violet-100">
          Transparent GH₵ figures only. Estimated bonuses are never mixed with withdrawable cash.
          GH₵100,000 a year is an aspiration — not a promise from Giga3 AI.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1.5" aria-label="Earnings centre sections">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-medium",
              tab === id
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-border bg-white text-muted"
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      {tab === "overview" ? (
        <div className="space-y-4">
          <section className="saas-card rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Flag className="h-4 w-4 text-violet-700" aria-hidden />
                  Monetisation status
                </h3>
                <p className="mt-1 text-lg font-semibold text-foreground">{statusCopy.title}</p>
                <p className="mt-1 text-sm text-muted">{statusCopy.meaning}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted">{FAN_LABELS.fans}</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCompactCount(dashboard.fanCount)} / {dashboard.fansRequired}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/30">
              <div
                className="h-full rounded-full bg-violet-600"
                style={{
                  width: `${fanProgressPercent(dashboard.fanCount, dashboard.fansRequired)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {dashboard.fanEligible
                ? "Fan threshold met."
                : `${fansRemaining(dashboard.fanCount, dashboard.fansRequired)} more fans to eligibility.`}
            </p>
            <ul className="mt-3 space-y-1.5">
              {checklist.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2 text-sm",
                    item.met ? "text-foreground" : "text-muted"
                  )}
                >
                  <span aria-hidden>{item.met ? "✓" : "○"}</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            {dashboard.showEligibleInvite ||
            dashboard.requiresPolicyReacceptance ||
            (dashboard.fanEligible && !dashboard.monetizationAccepted) ? (
              <div className="mt-3">
                <GigaSocialMonetizationAccept
                  sessionToken={sessionToken}
                  reacceptance={Boolean(dashboard.requiresPolicyReacceptance)}
                />
              </div>
            ) : null}
            {statusId === "eligible_to_apply" && dashboard.monetizationAccepted ? (
              <Button type="button" className="mt-3" disabled={busy} onClick={() => void onApply()}>
                Submit monetisation application
              </Button>
            ) : null}
            {(statusId === "monetization_rejected" || statusId === "appeal_available") &&
            dashboard.application?.rejectionReason ? (
              <p className="mt-3 text-sm text-foreground">
                Reason: {dashboard.application.rejectionReason}
              </p>
            ) : null}
            {statusId === "monetization_rejected" || statusId === "appeal_available" ? (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-muted" htmlFor="appeal-text">
                  Appeal (optional)
                </label>
                <textarea
                  id="appeal-text"
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
                  placeholder="Share new facts for review…"
                />
                <Button type="button" size="sm" disabled={busy} onClick={() => void onAppeal()}>
                  Submit appeal
                </Button>
              </div>
            ) : null}
          </section>

          <section className="saas-card rounded-2xl border border-border p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wallet className="h-4 w-4 text-violet-700" aria-hidden />
              Earnings summary (GH₵)
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <MoneyTile
                label="Verified cash earnings"
                value={formatGhs(verified)}
                hint="Paystack tip share + Marketplace sales only (not credit gifts, not estimates)"
              />
              <MoneyTile
                label="Available for withdrawal"
                value={formatGhs(available)}
                hint="Approved balance on your creator payout profile"
              />
              <MoneyTile
                label="Affiliate (tracked)"
                value={formatGhs(dashboard.affiliateEarningsGhs)}
                hint="Not automatically withdrawable until settled"
              />
              <MoneyTile
                label="Unfunded content estimate"
                value={formatGhs(unfunded)}
                hint="Not cash. Not available for withdrawal."
                muted
              />
            </div>
            {verified <= 0 && available <= 0 ? (
              <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900">
                No verified earnings yet. Tips and Marketplace sales appear here after successful
                payments — never sample figures.
              </p>
            ) : null}
            <p className="mt-3 flex gap-2 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Withdrawals create a pending request. Automated Paystack Transfers are not live; money
              is not marked paid without provider confirmation.
            </p>
            {dashboard.recentPayouts?.length ? (
              <ul className="mt-3 space-y-1.5 text-sm">
                {dashboard.recentPayouts.slice(0, 5).map((p) => (
                  <li
                    key={p.payoutId}
                    className="flex justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <span>{formatGhs(p.amountGhs)}</span>
                    <span className="text-muted">{p.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted">No payout history yet.</p>
            )}
          </section>
        </div>
      ) : null}

      {tab === "sources" ? (
        <section className="saas-card space-y-3 rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Earning sources</h3>
          <ul className="space-y-2">
            {EARNING_SOURCES.map((source) => (
              <li
                key={source.id}
                className="rounded-xl border border-border bg-white px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{source.name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      source.availability === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-muted/40 text-muted"
                    )}
                  >
                    {availabilityLabel(source.availability)}
                  </span>
                </div>
                <p className="mt-1 text-muted">{source.description}</p>
                <p className="mt-1 text-xs text-muted">{source.notes}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "rewards" ? (
        <div className="space-y-4">
          <section className="saas-card rounded-2xl border border-border p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Gift className="h-4 w-4 text-violet-700" aria-hidden />
              Reward catalogue
            </h3>
            <ul className="mt-3 space-y-2">
              {REWARD_CATALOGUE.map((reward) => (
                <li
                  key={reward.id}
                  className="rounded-xl border border-border px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{reward.name}</p>
                    <span className="text-xs text-muted">
                      {isRewardClaimable(reward) ? "Active" : "Not available"}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">{reward.description}</p>
                  <p className="mt-1 text-xs text-muted">{reward.terms}</p>
                  {reward.rewardType === "cash_bonus" ? (
                    <p className="mt-1 text-xs font-medium text-violet-800">
                      Cash: {formatGhs(reward.cashAmountGhs ?? 0)} · budget approved:{" "}
                      {reward.budgetApproved ? "yes" : "no"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
          <section className="saas-card rounded-2xl border border-border p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Award className="h-4 w-4 text-violet-700" aria-hidden />
              Awards (coming recognition)
            </h3>
            <ul className="mt-3 space-y-2">
              {AWARD_CATEGORIES.map((award) => (
                <li key={award.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                  <p className="font-semibold text-foreground">{award.name}</p>
                  <p className="text-xs text-muted">{award.criteria}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Winners are not chosen by raw views alone. Cash prizes require approved funding.
            </p>
          </section>
          {dashboard.badges?.length ? (
            <section className="saas-card rounded-2xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">Your badges</h3>
              <p className="mt-1 text-sm text-muted">{dashboard.badges.join(" · ")}</p>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "goal" ? (
        <section className="saas-card space-y-4 rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target className="h-4 w-4 text-violet-700" aria-hidden />
            Annual earnings goal planner
          </h3>
          <p className="text-sm text-muted">
            GH₵100,000 / year ≈ {formatGhs(targetParts.perMonth)} per month ·{" "}
            {formatGhs(targetParts.perWeek)} per week · {formatGhs(targetParts.perDay)} per day.
            This is an ambitious goal, not a guarantee.
          </p>
          <label className="block text-xs font-medium text-muted" htmlFor="annual-target">
            Your annual target (GH₵)
          </label>
          <input
            id="annual-target"
            type="number"
            min={0}
            step={1000}
            value={annualTarget}
            onChange={(e) => setAnnualTarget(Number(e.target.value) || 0)}
            className="w-full max-w-xs rounded-xl border border-border px-3 py-2 text-sm"
          />
          <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted">Verified YTD</dt>
              <dd className="font-semibold">{formatGhs(goal.verifiedYtdGhs)}</dd>
            </div>
            <div>
              <dt className="text-muted">Remaining</dt>
              <dd className="font-semibold">{formatGhs(goal.remainingGhs)}</dd>
            </div>
            <div>
              <dt className="text-muted">Progress</dt>
              <dd className="font-semibold">{goal.percentReached.toFixed(1)}%</dd>
            </div>
            <div>
              <dt className="text-muted">Required daily (remaining)</dt>
              <dd className="font-semibold">
                {goal.requiredAverageDailyRemaining != null
                  ? formatGhs(goal.requiredAverageDailyRemaining)
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted">{goal.projectionNote}</p>
          <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/50 p-3">
            <p className="text-sm font-semibold text-foreground">
              Hypothetical monthly assumptions (estimates only)
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["tips", "Tips / gifts"],
                  ["marketplace", "Marketplace"],
                  ["affiliate", "Affiliate"],
                  ["sponsorships", "Sponsorships (your estimate)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-xs text-muted">
                  {label} (GH₵ / month)
                  <input
                    type="number"
                    min={0}
                    value={scenario[key]}
                    onChange={(e) =>
                      setScenario((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value) || 0,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-foreground"
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 text-sm text-foreground">
              Scenario annual total:{" "}
              <strong>{formatGhs(scenarioTotals.annualTotal)}</strong> (your math — not a promise)
            </p>
          </div>
        </section>
      ) : null}

      {tab === "guide" ? (
        <section className="saas-card space-y-4 rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-violet-700" aria-hidden />
            Creator Earnings Guide
          </h3>
          {CREATOR_EARNINGS_GUIDE.map((section) => (
            <article key={section.id}>
              <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 24)} className="mt-1 text-sm text-muted">
                  {p}
                </p>
              ))}
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
});

function MoneyTile({
  label,
  value,
  hint,
  muted,
}: {
  label: string;
  value: string;
  hint: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3",
        muted ? "border-dashed border-border bg-muted/20" : "border-border bg-white"
      )}
    >
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}
