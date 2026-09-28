"use client";

import { Button } from "@/components/ui/Button";
import { getSessionToken } from "@/lib/auth";
import { getAdaptiveAchievements, getStreakInfo, syncAdaptiveAchievements } from "@/lib/gigalearn/achievements";
import { getSubject } from "@/lib/gigalearn/curriculumEngine";
import { computeMastery } from "@/lib/gigalearn/mastery";
import { getProgressSnapshot } from "@/lib/gigalearn/workspace";
import { buildLearningPath, nextActivity, type RecommendationInput } from "@/lib/gigalearn/recommendations";
import { collectKnownTopics, groupRevisionTopics } from "@/lib/gigalearn/revision";
import { filterSignals, getSignals } from "@/lib/gigalearn/signals";
import type { StudioContext } from "@/lib/gigalearn/studioContext";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Award, Flame, GraduationCap, ListChecks, Sparkles, Star } from "lucide-react";
import { memo, useMemo } from "react";

interface StudentDashboardProps {
  onNavigate: (tab: "learn" | "tutor" | "revision" | "library") => void;
  onStudyTopic: (patch: Partial<StudioContext>, tab: "learn" | "tutor") => void;
}

export const StudentDashboard = memo(function StudentDashboard({ onNavigate, onStudyTopic }: StudentDashboardProps) {
  const sessionToken = getSessionToken();
  const serverRows = useQuery(
    api.gigaLearnProgress.listProgress,
    sessionToken ? { sessionToken, limit: 30 } : "skip"
  );

  const signals = useMemo(() => getSignals(), []);
  const progress = useMemo(() => getProgressSnapshot(), []);
  const achievements = useMemo(() => [...progress.achievements, ...syncAdaptiveAchievements()], [progress]);
  const streak = useMemo(() => getStreakInfo(), []);

  const topics = useMemo(() => collectKnownTopics(signals), [signals]);
  const groups = useMemo(
    () =>
      groupRevisionTopics(topics, {
        signals,
        serverRows: (serverRows ?? []).map(
          (r: { topicKey: string; lastScore?: number | null; practiceCount?: number; needsReassess?: boolean }) => ({
            topicKey: r.topicKey,
            lastScore: r.lastScore,
            practiceCount: r.practiceCount,
            needsReassess: r.needsReassess,
          })
        ),
      }),
    [topics, signals, serverRows]
  );

  const recentActivity = useMemo(() => signals.slice(0, 5), [signals]);

  const recommendationInputs: RecommendationInput[] = useMemo(
    () =>
      topics.slice(0, 8).map((t) => {
        const scoped = filterSignals(signals, { subjectId: t.subjectId, topic: t.topic || t.strand });
        const scored = scoped.filter((s) => s.score != null);
        return {
          ...t,
          label: t.label,
          recentCorrect: scored.filter((s) => (s.score ?? 0) >= 70).length,
          recentTotal: scored.length,
          mistakes: scoped.filter((s) => s.correct === false).length,
        };
      }),
    [topics, signals]
  );
  const next = useMemo(() => nextActivity(recommendationInputs), [recommendationInputs]);

  const topTopic = groups.reviewNow[0] ?? groups.continuelearning[0] ?? null;
  const path = useMemo(
    () => (topTopic ? buildLearningPath(topTopic.label, topTopic.mastery.state === "learning") : []),
    [topTopic]
  );

  const progressing = useMemo(
    () =>
      topics.slice(0, 6).map((t) => ({
        topic: t,
        mastery: computeMastery(t, { signals }),
      })),
    [topics, signals]
  );

  const bySubject = useMemo(() => {
    const map = new Map<string, { label: string; topics: number; proficient: number }>();
    for (const t of topics) {
      const key = t.subjectId || "general";
      const mastery = computeMastery(t, { signals });
      const entry = map.get(key) ?? {
        label: getSubject(key)?.label ?? key,
        topics: 0,
        proficient: 0,
      };
      entry.topics += 1;
      if (mastery.state === "proficient" || mastery.state === "mastered") entry.proficient += 1;
      map.set(key, entry);
    }
    return [...map.values()].slice(0, 6);
  }, [topics, signals]);

  return (
    <div className="space-y-4">
      {topics.length === 0 ? (
        <div className="saas-card rounded-2xl border border-dashed border-border p-8 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-accent" aria-hidden />
          <p className="mt-2 text-sm font-medium text-foreground">Welcome to My Learning</p>
          <p className="mt-1 text-sm text-muted">
            Your adaptive path appears here once you practice, quiz or chat with your tutor.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button type="button" className="min-h-11" onClick={() => onNavigate("learn")}>
              Start learning
            </Button>
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => onNavigate("tutor")}>
              Meet your tutor
            </Button>
          </div>
        </div>
      ) : (
        <>
          {next && (
            <section className="saas-card rounded-2xl border border-accent/25 bg-accent/5 p-4" aria-label="Recommended next activity">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {next.title}
              </p>
              <p className="mt-1 text-sm text-foreground">{next.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  onClick={() =>
                    onStudyTopic(
                      { subjectId: next.scope.subjectId, levelId: next.scope.levelId, topic: next.scope.topic },
                      "learn"
                    )
                  }
                >
                  Start now
                </Button>
                <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => onNavigate("revision")}>
                  Open revision
                </Button>
              </div>
            </section>
          )}

          {topTopic && (
            <section className="saas-card rounded-2xl border border-border p-4" aria-label="Current learning path">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListChecks className="h-4 w-4 text-accent" aria-hidden />
                Current path: {getSubject(topTopic.subjectId)?.label ?? topTopic.subjectId} · {topTopic.label}
              </h3>
              <ol className="mt-3 space-y-1.5">
                {path.map((step, i) => (
                  <li key={step.id} className="flex items-start gap-2 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-medium text-foreground">{step.label}</span>
                      <span className="block text-xs text-muted">{step.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <section className="saas-card rounded-2xl border border-border p-4" aria-label="Topics needing review">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Flame className="h-4 w-4 text-amber-600" aria-hidden />
                Needs review ({groups.reviewNow.length})
              </h3>
              {groups.reviewNow.length === 0 ? (
                <p className="mt-2 text-xs text-muted">Nothing needs attention right now.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {groups.reviewNow.slice(0, 4).map((t) => (
                    <li key={t.topic || t.indicator} className="text-sm text-foreground">
                      {t.label}
                      <span className="block text-xs text-muted">{t.mastery.score}% · {t.mastery.state}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="saas-card rounded-2xl border border-border p-4" aria-label="Topics progressing well">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Star className="h-4 w-4 text-emerald-600" aria-hidden />
                Progressing well
              </h3>
              {progressing.filter((p) => p.mastery.state === "proficient" || p.mastery.state === "mastered").length === 0 ? (
                <p className="mt-2 text-xs text-muted">Strong results will show here as you practice.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {progressing
                    .filter((p) => p.mastery.state === "proficient" || p.mastery.state === "mastered")
                    .slice(0, 4)
                    .map((p) => (
                      <li key={p.topic.topic || p.topic.indicator} className="text-sm text-foreground">
                        {p.topic.label}
                        <span className="block text-xs text-muted">{p.mastery.score}% · {p.mastery.state}</span>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </div>

          <section className="saas-card rounded-2xl border border-border p-4" aria-label="Progress by subject">
            <h3 className="text-sm font-semibold text-foreground">Progress by subject</h3>
            <p className="mt-1 text-xs text-muted">Topic-level learning states — not official grades.</p>
            <ul className="mt-2 space-y-1.5">
              {bySubject.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">{s.label}</span>
                  <span className="text-xs text-muted">{s.proficient}/{s.topics} strong</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="saas-card rounded-2xl border border-border p-4" aria-label="Recent activity">
            <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
            {recentActivity.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No activity yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {recentActivity.map((s) => (
                  <li key={s.id} className="text-xs text-muted">
                    <span className="font-medium capitalize text-foreground">{s.type.replace(/-/g, " ")}</span>
                    {" · "}
                    {getSubject(s.subjectId)?.label ?? s.subjectId}
                    {s.topic ? ` · ${s.topic}` : ""}
                    {s.score != null ? ` · ${s.score}%` : ""}
                    {" · "}
                    {new Date(s.at).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="saas-card rounded-2xl border border-border p-4" aria-label="Streak">
            <h3 className="text-sm font-semibold text-foreground">Your rhythm</h3>
            <p className="mt-1 text-xs text-muted">{streak.message}</p>
          </section>

          {achievements.length > 0 && (
            <section aria-label="Achievements">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Award className="h-4 w-4 text-accent" aria-hidden />
                Recent achievements
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {achievements.slice(-4).map((a) => (
                  <li key={a.id} className="saas-card rounded-xl border border-border px-3 py-2.5 text-sm">
                    <p className="font-medium text-foreground">{a.label}</p>
                    <p className="text-xs text-muted">{a.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
});
