"use client";

import { StudioContextBar } from "@/components/gigalearn/StudioContextBar";
import { Button } from "@/components/ui/Button";
import { getSessionToken } from "@/lib/auth";
import { getSubject } from "@/lib/gigalearn/curriculumEngine";
import {
  collectKnownTopics,
  groupRevisionTopics,
  spacedBuckets,
  type KnownTopic,
  type ReviewTopic,
} from "@/lib/gigalearn/revision";
import { weakTopicMessage } from "@/lib/gigalearn/mastery";
import { getSignals } from "@/lib/gigalearn/signals";
import {
  getStudioContext,
  type StudioContext,
} from "@/lib/gigalearn/studioContext";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, BellOff, CalendarCheck, Flame, GraduationCap, RotateCcw, Star } from "lucide-react";
import { memo, useMemo, useState } from "react";

interface RevisionCenterProps {
  onStudyTopic: (patch: Partial<StudioContext>, tab: "learn" | "tutor" | "studio") => void;
}

export const RevisionCenter = memo(function RevisionCenter({ onStudyTopic }: RevisionCenterProps) {
  const [ctx, setCtx] = useState<StudioContext>(() => getStudioContext());
  const sessionToken = getSessionToken();
  const serverRows = useQuery(
    api.gigaLearnProgress.listProgress,
    sessionToken ? { sessionToken, limit: 30 } : "skip"
  );

  const signals = useMemo(() => getSignals(), []);
  const topics: KnownTopic[] = useMemo(() => collectKnownTopics(signals), [signals]);
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
        flashcardDecks: [],
      }),
    [topics, signals, serverRows]
  );
  const buckets = useMemo(() => spacedBuckets([], signals), [signals]);

  const hasHistory = topics.length > 0;

  function studyPatch(t: KnownTopic): Partial<StudioContext> {
    return {
      subjectId: t.subjectId,
      levelId: t.levelId,
      strand: t.strand,
      subStrand: t.subStrand,
      topic: t.topic,
      indicator: t.indicator,
    };
  }

  return (
    <div className="space-y-4">
      <StudioContextBar ctx={ctx} onChange={(next) => setCtx(next)} idPrefix="gl-revision" changeLabel="Change context" />

      <p className="flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2.5 text-xs text-muted">
        <BellOff className="h-4 w-4 shrink-0" aria-hidden />
        Gentle suggestions only — no notification floods. Review at your own pace.
      </p>

      {!hasHistory ? (
        <div className="saas-card rounded-2xl border border-dashed border-border p-8 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-accent" aria-hidden />
          <p className="mt-2 text-sm font-medium text-foreground">Nothing to revise yet</p>
          <p className="mt-1 text-sm text-muted">
            Practice a quiz or chat with your tutor — your review list builds itself from real activity.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button type="button" className="min-h-11" onClick={() => onStudyTopic({}, "learn")}>
              Start learning
            </Button>
            <Button type="button" variant="secondary" className="min-h-11" onClick={() => onStudyTopic({}, "tutor")}>
              Ask the tutor
            </Button>
          </div>
        </div>
      ) : (
        <>
          <RevisionGroup
            title="Review Now"
            icon={<Flame className="h-4 w-4 text-amber-600" aria-hidden />}
            empty="Nothing urgent — lovely."
            topics={groups.reviewNow}
            onStudyTopic={onStudyTopic}
            studyPatch={studyPatch}
            cautious
          />
          <RevisionGroup
            title="Practice Again"
            icon={<RotateCcw className="h-4 w-4 text-accent" aria-hidden />}
            empty="No recent mistakes to retry."
            topics={groups.practiceAgain}
            onStudyTopic={onStudyTopic}
            studyPatch={studyPatch}
          />
          <RevisionGroup
            title="Continue Learning"
            icon={<ArrowRight className="h-4 w-4 text-accent" aria-hidden />}
            empty="Pick any topic to keep going."
            topics={groups.continuelearning}
            onStudyTopic={onStudyTopic}
            studyPatch={studyPatch}
          />
          <RevisionGroup
            title="Mastered"
            icon={<Star className="h-4 w-4 text-emerald-600" aria-hidden />}
            empty="Strong results will appear here."
            topics={groups.mastered}
            onStudyTopic={onStudyTopic}
            studyPatch={studyPatch}
          />

          {(buckets.recentlyMissed.length > 0 || buckets.frequentlyForgotten.length > 0 || buckets.stronglyRemembered.length > 0) && (
            <section className="saas-card rounded-2xl border border-border p-4" aria-label="Spaced review">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarCheck className="h-4 w-4 text-accent" aria-hidden />
                Spaced review
              </h3>
              {buckets.recentlyMissed.length > 0 && (
                <p className="mt-2 text-xs text-muted">Recently missed: {buckets.recentlyMissed.join(", ")}</p>
              )}
              {buckets.frequentlyForgotten.length > 0 && (
                <p className="mt-1 text-xs text-muted">Frequently forgotten: {buckets.frequentlyForgotten.join(", ")}</p>
              )}
              {buckets.stronglyRemembered.length > 0 && (
                <p className="mt-1 text-xs text-muted">Strongly remembered: {buckets.stronglyRemembered.join(", ")}</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
});

function RevisionGroup({
  title,
  icon,
  empty,
  topics,
  onStudyTopic,
  studyPatch,
  cautious,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  topics: ReviewTopic[];
  onStudyTopic: RevisionCenterProps["onStudyTopic"];
  studyPatch: (t: KnownTopic) => Partial<StudioContext>;
  cautious?: boolean;
}) {
  return (
    <section className="saas-card rounded-2xl border border-border p-4" aria-label={title}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
        <span className="text-xs font-normal text-muted">({topics.length})</span>
      </h3>
      {topics.length === 0 ? (
        <p className="mt-2 text-xs text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {topics.map((t) => (
            <li
              key={`${t.subjectId}/${t.levelId}/${t.topic || t.indicator}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {getSubject(t.subjectId)?.label ?? t.subjectId} · {t.label}
                </p>
                <p className="text-xs text-muted">
                  {cautious ? weakTopicMessage(t.label) : `${t.mastery.score}% · ${t.mastery.state}`}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="secondary" className="min-h-9" onClick={() => onStudyTopic(studyPatch(t), "learn")}>
                  Revise
                </Button>
                <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={() => onStudyTopic(studyPatch(t), "tutor")}>
                  Tutor
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
