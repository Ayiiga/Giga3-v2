"use client";

import { CreditPromptLinks } from "@/components/billing/CreditPromptLinks";
import { CreatorResultPanel } from "@/components/creator-studio/CreatorResultPanel";
import { CurriculumSelector } from "@/components/gigalearn/CurriculumSelector";
import { PracticeSession } from "@/components/gigalearn/PracticeSession";
import { Button } from "@/components/ui/Button";
import { useGigaLearnGeneration } from "@/hooks/useGigaLearnGeneration";
import { getSessionToken } from "@/lib/auth";
import {
  weakTopicPracticeHeadline,
  weakTopicPracticeSubline,
  type WeakTopicHint,
} from "@/lib/gigalearn/practiceRecommendations";
import { isInteractivePracticeTool } from "@/lib/gigalearn/questions";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import {
  DEFAULT_CURRICULUM_SELECTION,
  EXTRA_CONTEXT_FIELDS,
  formatExtraContext,
  getCountry,
  getCurriculum,
  getLevel,
  getSubject,
  resolveLegacyLevelId,
  resolveSubjectId,
  subjectPlaceholder,
  type CurriculumSelection,
} from "@/lib/gigalearn/curriculumEngine";
import type { ExamBoardId } from "@/lib/gigalearn/curricula";
import { getGigaLearnProfile, saveGigaLearnProfile } from "@/lib/gigalearn/profile";
import { getStudioContext } from "@/lib/gigalearn/studioContext";
import type { GigaLearnToolDefinition } from "@/lib/gigalearn/tools";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";

interface GigaLearnToolPanelProps {
  tools: GigaLearnToolDefinition[];
  credits: number | null;
}

function examBoardForSelection(selection: CurriculumSelection): ExamBoardId {
  const level = getLevel(resolveLegacyLevelId(selection.levelId));
  if (level?.band === "shs") return "wassce";
  if (level?.band === "jhs") return "bece";
  if (level?.band === "primary" || level?.band === "early-years") return "primary";
  return "bece";
}

export const GigaLearnToolPanel = memo(function GigaLearnToolPanel({
  tools,
  credits,
}: GigaLearnToolPanelProps) {
  const { phase, loading, error, result, questions, run, regenerate, clear } =
    useGigaLearnGeneration();
  const [activeToolId, setActiveToolId] = useState(tools[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [learningObjective, setLearningObjective] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<CurriculumSelection>(DEFAULT_CURRICULUM_SELECTION);
  const [focusWeakRevision, setFocusWeakRevision] = useState(false);

  const serverProgress = useQuery(
    api.gigaLearnProgress.listProgress,
    getSessionToken() ? { sessionToken: getSessionToken()!, limit: 5 } : "skip"
  );
  const weakTopicHints: WeakTopicHint[] = (serverProgress ?? [])
    .filter((row) => row.weakness || row.needsReassess || (row.lastScore != null && row.lastScore < 70))
    .map((row) => ({
      topicKey: row.topicKey,
      subject: row.subject,
      label: row.weakness ?? row.topicKey.replace(/\//g, " · "),
      lastScore: row.lastScore,
    }));
  const topWeakTopic = weakTopicHints[0];

  useEffect(() => {
    const profile = getGigaLearnProfile();
    setSelection({
      ...DEFAULT_CURRICULUM_SELECTION,
      levelId: resolveLegacyLevelId(profile.level) || DEFAULT_CURRICULUM_SELECTION.levelId,
      subjectId: resolveSubjectId(profile.subjects[0]) || DEFAULT_CURRICULUM_SELECTION.subjectId,
    });
  }, []);

  const activeTool = tools.find((t) => t.id === activeToolId) ?? tools[0];
  const insufficientCredits = credits != null && credits < (activeTool?.creditCost ?? 2);
  const isPracticeTool = isInteractivePracticeTool(activeToolId);
  const practiceTopic = prompt.trim().slice(0, 80) || selection.topic || getSubject(selection.subjectId)?.label || selection.subjectId;

  const requestPlaceholder = useMemo(() => {
    if (selection.subjectId) return subjectPlaceholder(selection.subjectId);
    return activeTool?.placeholder;
  }, [selection.subjectId, activeTool]);

  function persistProfile(next: CurriculumSelection) {
    saveGigaLearnProfile({
      examBoard: examBoardForSelection(next),
      level: next.levelId,
      subjects: next.subjectId ? [next.subjectId] : [],
    });
  }

  function combinedContext(): string {
    const structured = formatExtraContext(extra);
    const parts = [structured, generalNotes.trim()].filter(Boolean);
    return parts.join("\n");
  }

  function curriculumLabel(): string {
    return getCurriculum(selection.curriculumId)?.label ?? selection.curriculumId;
  }

  function levelLabel(): string {
    return getLevel(resolveLegacyLevelId(selection.levelId))?.label ?? selection.levelId;
  }

  function subjectLabel(): string {
    return getSubject(selection.subjectId)?.label ?? selection.subjectId;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const selected = tool.id === activeToolId;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveToolId(tool.id);
                  setFocusWeakRevision(false);
                  clear();
                }}
                className={cn(
                  "saas-card flex min-h-11 items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                  selected
                    ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
                    : "border-border hover:border-accent/25"
                )}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="block text-sm font-medium text-foreground">{tool.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{tool.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <CurriculumSelector
          value={selection}
          onChange={(next) => {
            setSelection(next);
            persistProfile(next);
          }}
        />

        <div>
          <label htmlFor="gigalearn-objective" className="mb-2 block text-sm font-medium text-muted">
            Learning objective (optional)
          </label>
          <input
            id="gigalearn-objective"
            value={learningObjective}
            onChange={(e) => setLearningObjective(e.target.value)}
            placeholder="e.g. Learners can identify states of matter with local examples"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
          />
        </div>

        <div>
          <label htmlFor="gigalearn-prompt" className="mb-2 block text-sm font-medium text-muted">
            Your request
          </label>
          <textarea
            id="gigalearn-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder={requestPlaceholder}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
          />
        </div>

        <details className="rounded-2xl border border-border bg-white">
          <summary className="min-h-11 cursor-pointer px-3 py-2.5 text-sm font-medium text-foreground">
            Extra context (optional)
          </summary>
          <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
            {EXTRA_CONTEXT_FIELDS.map((field) => (
              <div key={field.id}>
                <label htmlFor={`gigalearn-extra-${field.id}`} className="mb-1.5 block text-xs font-medium text-muted">
                  {field.label}
                </label>
                <input
                  id={`gigalearn-extra-${field.id}`}
                  value={extra[field.id] ?? ""}
                  onChange={(e) => setExtra((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label htmlFor="gigalearn-context" className="mb-1.5 block text-xs font-medium text-muted">
                Anything else
              </label>
              <input
                id="gigalearn-context"
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Class size, language preference, specific syllabus topic…"
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={loading || insufficientCredits || !prompt.trim()}
            onClick={() =>
              void run({
                toolId: activeToolId,
                section: activeTool?.section,
                prompt,
                curriculum: curriculumLabel(),
                subject: subjectLabel(),
                level: levelLabel(),
                context: combinedContext() || undefined,
                country: getCountry(selection.countryId)?.name,
                grade: getLevel(resolveLegacyLevelId(selection.levelId))?.gradeLabel,
                strand: selection.strand || undefined,
                subStrand: selection.subStrand || undefined,
                topic: selection.topic || undefined,
                learningObjective: learningObjective.trim() || undefined,
                levelId: selection.levelId || undefined,
                methodologyIds: getStudioContext().methodologyIds?.length
                  ? [...getStudioContext().methodologyIds]
                  : undefined,
              })
            }
            className="min-h-11"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            Generate
          </Button>
          {insufficientCredits && (
            <CreditPromptLinks
              creditCost={activeTool?.creditCost ?? 2}
              className="text-xs text-amber-700"
            />
          )}
          {phase === "success" && (
            <p className="text-xs text-muted">Saved to your learning workspace.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {isPracticeTool && topWeakTopic && (
          <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              {weakTopicPracticeHeadline(topWeakTopic)}
            </p>
            <p className="mt-1 text-xs text-muted">{weakTopicPracticeSubline(topWeakTopic)}</p>
            {phase === "success" && questions.length > 0 && (
              <button
                type="button"
                onClick={() => setFocusWeakRevision(true)}
                className="mt-3 rounded-xl border border-accent/40 bg-white px-3 py-2 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Practice what you need most
              </button>
            )}
          </div>
        )}

        {isPracticeTool && phase === "success" && questions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Interactive practice</h3>
              <p className="text-xs text-muted">Answering is free — credits were used for generation only.</p>
            </div>
            <PracticeSession
              questions={questions}
              level={levelLabel()}
              subject={subjectLabel()}
              topic={practiceTopic}
              toolId={activeToolId}
              curriculum={curriculumLabel()}
              sessionToken={getSessionToken()}
              weakTopicHints={weakTopicHints}
              focusWeakRevision={focusWeakRevision}
            />
          </div>
        )}

        <CreatorResultPanel
          content={result}
          loading={loading}
          error={error}
          onRegenerate={() => void regenerate()}
        />
      </div>
    </div>
  );
});
