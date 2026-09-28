"use client";

import { Button } from "@/components/ui/Button";
import { getSubject } from "@/lib/gigalearn/curriculumEngine";
import { collectKnownTopics, groupRevisionTopics } from "@/lib/gigalearn/revision";
import { getSignals } from "@/lib/gigalearn/signals";
import { getTeacherAnalytics, getProgressSnapshot } from "@/lib/gigalearn/workspace";
import type { StudioContext } from "@/lib/gigalearn/studioContext";
import { BarChart3, BookOpen, ClipboardCheck, Eye, FlaskConical, ShieldCheck, Sparkles } from "lucide-react";
import { memo, useMemo } from "react";

interface TeacherInsightsProps {
  onIntervene: (patch: Partial<StudioContext>, tab: "studio" | "learn" | "tutor" | "revision" | "library") => void;
}

/**
 * Phase 3 teacher insights (additive).
 *
 * Aggregates ONLY the teacher's own on-device data (signals, artifacts,
 * progress snapshot). Never touches other learners' performance, never
 * exposes personal information, and every AI suggestion is framed as
 * assistance — teacher judgment stays authoritative.
 */
export const TeacherInsights = memo(function TeacherInsights({ onIntervene }: TeacherInsightsProps) {
  const signals = useMemo(() => getSignals(), []);
  const analytics = useMemo(() => getTeacherAnalytics(), []);
  const progress = useMemo(() => getProgressSnapshot(), []);

  const topics = useMemo(() => collectKnownTopics(signals), [signals]);
  const groups = useMemo(() => groupRevisionTopics(topics, { signals }), [topics, signals]);

  const missedTopics = useMemo(() => {
    const counts = new Map<string, { label: string; subjectId: string; levelId: string; misses: number; patch: Partial<StudioContext> }>();
    for (const s of signals) {
      const bad = s.correct === false || (s.score != null && s.score < 50);
      if (!bad || !s.subjectId) continue;
      const key = [s.subjectId, s.levelId, s.topic || s.strand].join("/").toLowerCase();
      const existing = counts.get(key);
      if (existing) existing.misses += 1;
      else {
        counts.set(key, {
          label: s.topic || s.strand || s.subjectId,
          subjectId: s.subjectId,
          levelId: s.levelId,
          misses: 1,
          patch: {
            subjectId: s.subjectId,
            levelId: s.levelId,
            strand: s.strand,
            subStrand: s.subStrand,
            topic: s.topic,
            indicator: s.indicator,
          },
        });
      }
    }
    return [...counts.values()].sort((a, b) => b.misses - a.misses).slice(0, 5);
  }, [signals]);

  const scored = useMemo(() => signals.filter((s) => s.score != null), [signals]);
  const avgScore = scored.length
    ? Math.round(scored.reduce((a, s) => a + (s.score ?? 0), 0) / scored.length)
    : null;
  const hintUses = signals.filter((s) => s.type === "hint-used").length;

  const trend = useMemo(() => {
    const days: Array<{ day: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      days.push({ day: d.slice(5), count: signals.filter((s) => new Date(s.at).toISOString().slice(0, 10) === d).length });
    }
    return days;
  }, [signals]);
  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  const hasData = signals.length > 0 || analytics.resourcesCreated > 0;

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-2xl border border-border bg-white px-3 py-2.5 text-xs text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        Insights come only from activity on this device — your own resources and practice. No student personal
        data is exposed, and AI suggestions never replace your judgment on official assessments.
      </p>

      {!hasData ? (
        <div className="saas-card rounded-2xl border border-dashed border-border p-8 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-accent" aria-hidden />
          <p className="mt-2 text-sm font-medium text-foreground">No insights yet</p>
          <p className="mt-1 text-sm text-muted">
            Generate a lesson or run a practice session — frequently missed topics and usage trends will appear here.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button type="button" className="min-h-11" onClick={() => onIntervene({}, "studio")}>
              Open Teacher Studio
            </Button>
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => onIntervene({}, "learn")}>
              Try Learn Mode
            </Button>
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Teaching overview">
            <StatCard label="Resources created" value={String(analytics.resourcesCreated)} />
            <StatCard label="Scored attempts (this device)" value={String(scored.length)} />
            <StatCard label="Average score" value={avgScore != null ? `${avgScore}%` : "—"} />
            <StatCard label="Hints used" value={String(hintUses)} />
          </section>

          <section className="saas-card rounded-2xl border border-border p-4" aria-label="Frequently missed topics">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FlaskConical className="h-4 w-4 text-amber-600" aria-hidden />
              Frequently missed topics
            </h3>
            {missedTopics.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No repeated mistakes recorded on this device.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {missedTopics.map((t) => (
                  <li
                    key={`${t.subjectId}/${t.label}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {getSubject(t.subjectId)?.label ?? t.subjectId} · {t.label}
                      </p>
                      <p className="text-xs text-muted">{t.misses} recent mistake{t.misses === 1 ? "" : "s"} — may need reteaching.</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button type="button" size="sm" variant="secondary" className="min-h-9" onClick={() => onIntervene(t.patch, "studio")}>
                        Reteach
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={() => onIntervene(t.patch, "learn")}>
                        Assign practice
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {groups.reviewNow.length > 0 && (
            <section className="saas-card rounded-2xl border border-border p-4" aria-label="Topics needing more teaching">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BookOpen className="h-4 w-4 text-accent" aria-hidden />
                Topics that may need more teaching
              </h3>
              <ul className="mt-2 space-y-1.5">
                {groups.reviewNow.slice(0, 4).map((t) => (
                  <li key={t.topic || t.indicator} className="text-sm text-foreground">
                    {getSubject(t.subjectId)?.label ?? t.subjectId} · {t.label}
                    <span className="block text-xs text-muted">{t.mastery.score}% · {t.mastery.state} (learning state, not a grade)</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="saas-card rounded-2xl border border-border p-4" aria-label="Activity trend">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Eye className="h-4 w-4 text-accent" aria-hidden />
              Activity trend (7 days, this device)
            </h3>
            <div className="mt-3 flex items-end gap-1.5" role="img" aria-label={`Activity over the last 7 days, peak ${maxTrend} events in a day`}>
              {trend.map((t) => (
                <div key={t.day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-accent/30"
                    style={{ height: `${Math.max(4, Math.round((t.count / maxTrend) * 56))}px` }}
                  />
                  <span className="text-[10px] text-muted">{t.day}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {progress.practiceSessionsCompleted} practice sessions completed · {analytics.quizzesCreated} quizzes created · {analytics.assignmentsCreated} assignments created.
            </p>
          </section>

          <section className="saas-card rounded-2xl border border-border p-4" aria-label="Teacher interventions">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden />
              Intervene — your judgment leads
            </h3>
            <p className="mt-1 text-xs text-muted">
              Pick a topic above, or start from your current studio context. Official assessment decisions stay with you.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => onIntervene({}, "library")}>
                Recommend a resource
              </Button>
              <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => onIntervene({}, "learn")}>
                Assign practice
              </Button>
              <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => onIntervene({}, "revision")}>
                Assign revision
              </Button>
              <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => onIntervene({}, "studio")}>
                <ClipboardCheck className="h-4 w-4" aria-hidden />
                Create assessment
              </Button>
              <Button type="button" size="sm" variant="ghost" className="min-h-11" onClick={() => onIntervene({}, "tutor")}>
                Provide feedback via tutor
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
});

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="saas-card rounded-2xl border border-border px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
