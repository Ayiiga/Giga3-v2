"use client";

import { CreditPromptLinks } from "@/components/billing/CreditPromptLinks";
import { useGigaLearnGeneration } from "@/hooks/useGigaLearnGeneration";
import {
  EARLY_YEARS_SUBJECTS,
  EARLY_YEARS_TOPICS,
  type EarlyYearsSubjectId,
} from "@/lib/gigalearn/concreteObjects";
import {
  getCountry,
  getCurriculum,
  getLevel,
  getSubject,
  resolveSubjectId,
} from "@/lib/gigalearn/curriculumEngine";
import {
  gigaLearnLevelToCurriculumLevelId,
  type GigaLearnLevelId,
} from "@/lib/gigalearn/levels";
import { selectMethodologiesForContext } from "@/lib/gigalearn/methodologies";
import { studioContextIds, type StudioContext } from "@/lib/gigalearn/studioContext";
import { cn } from "@/lib/utils";
import { memo, useMemo, useState } from "react";

interface EarlyYearsActivityPanelProps {
  level: GigaLearnLevelId;
  ctx: StudioContext;
  credits: number | null;
  onCtxChange: (patch: Partial<StudioContext>) => void;
}

export const EarlyYearsActivityPanel = memo(function EarlyYearsActivityPanel({
  level,
  ctx,
  credits,
  onCtxChange,
}: EarlyYearsActivityPanelProps) {
  const { phase, loading, error, result, run, regenerate, clear } = useGigaLearnGeneration();
  const [subjectId, setSubjectId] = useState<EarlyYearsSubjectId>(
    (ctx.subjectId as EarlyYearsSubjectId) || "mathematics"
  );
  const [topicId, setTopicId] = useState<string>("count-1-5");

  const curriculumLevelId = gigaLearnLevelToCurriculumLevelId(level);
  const levelDef = getLevel(curriculumLevelId);
  const topics = EARLY_YEARS_TOPICS[subjectId] ?? [];
  const topicLabel = topics.find((t) => t.id === topicId)?.label ?? topics[0]?.label ?? "Counting";
  const subjectLabel = EARLY_YEARS_SUBJECTS.find((s) => s.id === subjectId)?.label ?? "Mathematics";
  const insufficientCredits = credits != null && credits < 2;

  const methodologyIds = useMemo(
    () =>
      selectMethodologiesForContext({
        levelBand: levelDef?.band ?? "early-years",
        subjectId,
        topic: topicLabel,
        max: 6,
      }).map((m) => m.id),
    [levelDef?.band, subjectId, topicLabel]
  );

  function syncContext(nextSubject: EarlyYearsSubjectId, nextTopic: string) {
    onCtxChange({
      countryId: "ghana",
      curriculumId: "gh-ccp",
      levelId: curriculumLevelId,
      subjectId: resolveSubjectId(nextSubject),
      topic: EARLY_YEARS_TOPICS[nextSubject]?.find((t) => t.id === nextTopic)?.label ?? nextTopic,
      methodologyIds,
    });
  }

  function handleSubject(next: EarlyYearsSubjectId) {
    setSubjectId(next);
    const firstTopic = EARLY_YEARS_TOPICS[next][0]?.id ?? "count-1-5";
    setTopicId(firstTopic);
    syncContext(next, firstTopic);
  }

  function handleTopic(next: string) {
    setTopicId(next);
    syncContext(subjectId, next);
  }

  function buildPrompt(kind: "learn" | "play" | "practise") {
    const grade = levelDef?.label ?? level;
    const action =
      kind === "play"
        ? "a short play-based game"
        : kind === "practise"
          ? "simple practice with matching or choosing"
          : "a short learning activity";
    return `Create ${action} for ${grade} ${subjectLabel}: "${topicLabel}".
Use concrete objects familiar in Ghana (fruits, vegetables, animals, household items).
Structure with short sections: SEE, HEAR, SAY, TOUCH, PLAY, PRACTISE, ANSWER.
Use emojis for objects. Very simple words — no long paragraphs. Maximum 350 words.
Include a simple progress note for teacher/parent at the end.`;
  }

  async function generate(kind: "learn" | "play" | "practise") {
    clear();
    const ids = studioContextIds({
      ...ctx,
      countryId: "ghana",
      curriculumId: "gh-ccp",
      levelId: curriculumLevelId,
      subjectId,
      topic: topicLabel,
      methodologyIds,
    });
    await run({
      toolId: "topic-explainer",
      prompt: buildPrompt(kind),
      curriculum: getCurriculum("gh-ccp")?.label,
      subject: getSubject(subjectId)?.label ?? subjectLabel,
      level: levelDef?.label,
      country: getCountry("ghana")?.name,
      grade: levelDef?.gradeLabel,
      topic: topicLabel,
      levelId: curriculumLevelId,
      methodologyIds,
      curriculumIds: {
        countryId: ids.countryId,
        curriculumId: ids.curriculumId,
        levelId: ids.levelId,
        gradeId: ids.gradeId,
        subjectId: resolveSubjectId(subjectId),
        topic: topicLabel,
      },
      title: `${level} ${subjectLabel}: ${topicLabel}`,
    });
  }

  const canGenerate = !loading && !insufficientCredits;

  return (
    <section aria-labelledby="gl-early-generate" className="space-y-3">
      <div className="rounded-2xl border border-[#EAB308] bg-[#1A233A] p-4">
        <h3 id="gl-early-generate" className="text-sm font-bold text-white">
          Learn · Play · Practise
        </h3>
        <p className="mt-1 text-[11px] text-gray-400">
          Pick a subject and topic, then generate an age-appropriate activity for {level}.
        </p>

        <div className="mt-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
          {EARLY_YEARS_SUBJECTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSubject(s.id)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold",
                subjectId === s.id
                  ? "border-[#FCD116]/50 bg-gradient-to-br from-[#FCD116] to-[#CE1126] text-black"
                  : "border-[#2A3441] bg-[#0D1323] text-gray-300"
              )}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTopic(t.id)}
              className={cn(
                "min-h-10 rounded-xl border px-3 py-1.5 text-xs font-semibold",
                topicId === t.id
                  ? "border-[#10B981] bg-[#10B981]/20 text-white"
                  : "border-[#2A3441] bg-[#0D1323] text-gray-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              { id: "learn" as const, label: "Learn", emoji: "👀" },
              { id: "play" as const, label: "Play", emoji: "🎮" },
              { id: "practise" as const, label: "Practise", emoji: "✋" },
            ] as const
          ).map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={!canGenerate}
              onClick={() => void generate(action.id)}
              className="min-h-12 rounded-xl bg-[#EAB308] px-2 py-2 text-xs font-bold text-black disabled:opacity-50"
            >
              {action.emoji} {action.label}
            </button>
          ))}
        </div>

        {insufficientCredits ? (
          <p className="mt-2 text-xs text-amber-200">
            You need at least 2 credits. <CreditPromptLinks />
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-4">
          <p className="animate-pulse text-sm text-gray-300">Creating your activity…</p>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-[#10B981]/40 bg-[#1E293B] p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#10B981]">
              {level} · {subjectLabel} · {topicLabel}
            </p>
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={loading}
              className="min-h-9 rounded-lg border border-[#2A3441] px-2 text-[10px] font-bold text-white"
            >
              Try again
            </button>
          </div>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
            {result}
          </div>
        </div>
      ) : null}

      {phase === "idle" && !result ? (
        <p className="text-[11px] text-gray-500">
          Tip: use Hear on fruits and animals above, then generate a matching activity here.
        </p>
      ) : null}
    </section>
  );
});
