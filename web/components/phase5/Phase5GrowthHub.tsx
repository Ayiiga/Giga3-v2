"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { usePhase5Flags } from "@/hooks/usePhase5Flags";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

/**
 * Compact hub for Phase 5 growth modules (all flag-gated).
 * Mount on /home or /whats-new — renders nothing when every flag is off.
 */
export function Phase5GrowthHub() {
  const flags = usePhase5Flags();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(getSessionToken());
  }, []);

  const any =
    flags.creatorSuccess ||
    flags.education ||
    flags.personalization ||
    flags.communityGrowth ||
    flags.monetizationBeta;
  if (!any || !token) return null;

  return (
    <div className="space-y-4">
      {flags.personalization && <PersonalizationCard sessionToken={token} />}
      {flags.communityGrowth && <ChallengeCard sessionToken={token} />}
      {flags.creatorSuccess && <CreatorSuccessCard sessionToken={token} />}
      {flags.education && <EducationCard sessionToken={token} />}
      {flags.monetizationBeta && <MonetizationCard sessionToken={token} />}
    </div>
  );
}

function PersonalizationCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase5Personalization.getPersonalizationBundle, {
    sessionToken,
  });
  if (!data?.enabled) return null;
  if (!data.consented) {
    return (
      <Card title="Personalization">
        <p className="text-sm text-muted">{data.message}</p>
        <p className="mt-2 text-xs text-muted">
          Enable “Share usage for personalization” in Privacy settings to opt in.
        </p>
      </Card>
    );
  }
  return (
    <Card title="Daily AI briefing">
      <p className="text-sm">{data.dailyBriefing}</p>
      {data.feedHints?.length ? (
        <ul className="mt-2 list-disc pl-5 text-xs text-muted">
          {data.feedHints.slice(0, 3).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function ChallengeCard({ sessionToken }: { sessionToken: string }) {
  const ensure = useMutation(api.phase5CommunityGrowth.ensureTodayChallenge);
  const complete = useMutation(api.phase5CommunityGrowth.completeTodayChallenge);
  const data = useQuery(api.phase5CommunityGrowth.getTodayChallenge, { sessionToken });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.enabled && !data.challenge) {
      void ensure({ sessionToken }).catch(() => {
        /* flag race / offline — card stays in preparing state */
      });
    }
  }, [data?.enabled, data?.challenge, ensure, sessionToken]);

  if (!data?.enabled) return null;
  return (
    <Card title="Daily challenge">
      {data.challenge ? (
        <>
          <p className="font-medium">{data.challenge.title}</p>
          <p className="mt-1 text-sm text-muted">{data.challenge.description}</p>
          {data.completed ? (
            <p className="mt-2 text-xs text-emerald-700">Completed — badge earned.</p>
          ) : (
            <Button
              className="mt-3"
              size="sm"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await complete({ sessionToken });
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Mark complete
            </Button>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">Preparing today’s challenge…</p>
      )}
    </Card>
  );
}

function CreatorSuccessCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase5CreatorSuccess.getCreatorSuccessInsights, {
    sessionToken,
  });
  if (!data?.enabled) return null;
  return (
    <Card title="Creator insights">
      <p className="text-sm text-muted">
        {data.metrics.postsSampled} posts · avg engagement {data.metrics.avgEngagement} ·
        best hour (UTC) {data.metrics.bestPostingHourUtc}:00
      </p>
      <p className="mt-2 text-xs font-medium">Caption ideas</p>
      <ul className="mt-1 list-disc pl-5 text-xs text-muted">
        {data.captions.slice(0, 2).map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{data.hashtags.join(" ")}</p>
    </Card>
  );
}

function EducationCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase5Education.getEducationExpansion, { sessionToken });
  if (!data?.enabled) return null;
  return (
    <Card title="Learning expansion">
      <p className="text-sm font-medium">{data.studyPlanner.title}</p>
      <ol className="mt-2 list-decimal pl-5 text-xs text-muted">
        {data.studyPlanner.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">{data.practiceQuizHint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink size="sm" variant="secondary" href={data.links.gigalearn}>
          Open GigaLearn
        </ButtonLink>
      </div>
    </Card>
  );
}

function MonetizationCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase5Monetization.getMonetizationBetaSummary, {
    sessionToken,
  });
  if (!data?.enabled) return null;
  return (
    <Card title="Creator monetization beta">
      <p className="text-sm text-muted">
        Balance {data.earnings.payoutBalanceGhs} GHS · active boosts{" "}
        {data.earnings.activeBoosts} · payouts {data.earnings.payoutHistoryCount}
      </p>
      <p className="mt-2 text-xs text-muted">{data.note}</p>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
