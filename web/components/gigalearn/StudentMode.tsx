"use client";

import { CreditPromptLinks } from "@/components/billing/CreditPromptLinks";
import { CreatorResultPanel } from "@/components/creator-studio/CreatorResultPanel";
import { CurriculumSelector } from "@/components/gigalearn/CurriculumSelector";
import { PracticeSession } from "@/components/gigalearn/PracticeSession";
import { Button } from "@/components/ui/Button";
import { useGigaLearnGeneration } from "@/hooks/useGigaLearnGeneration";
import { getSessionToken } from "@/lib/auth";
import {
  getCountry,
  getCurriculum,
  getLevel,
  getSubject,
  resolveLegacyLevelId,
} from "@/lib/gigalearn/curriculumEngine";
import { isInteractivePracticeTool } from "@/lib/gigalearn/questions";
import { selectMethodologiesForContext } from "@/lib/gigalearn/methodologies";
import {
  getStudioContext,
  saveStudioContext,
  studioContextIds,
  studioContextSummary,
  studioTopicKey,
  validateStudioContext,
  type StudioContext,
} from "@/lib/gigalearn/studioContext";
import { getSessionToken as getToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { BookOpen, ChevronDown, ClipboardList, FileQuestion, Lightbulb, ListChecks, MessageCircle, Sparkles } from "lucide-react";
import { memo, useState } from "react";

interface StudentModeProps {
  credits: number | null;
}

type LearnActionId = "explain" | "simplify" | "examples" | "practice" | "quiz" | "revise";

const LEARN_ACTIONS: Array<{
  id: LearnActionId;
  label: string;
  hint: string;
  icon: typeof Lightbulb;
  toolId: string;
  instruction: (topic: string, grade: string) => string;
}> = [
  {
    id: "explain",
    label: "Explain",
    hint: "Explain this topic to me.",
    icon: Lightbulb,
    toolId: "topic-explainer",
    instruction: (topic, grade) => `Explain this topic to me at ${grade} level: ${topic}.`,
  },
  {
    id: "simplify",
    label: "Simplify",
    hint: "Explain it in simple language.",
    icon: BookOpen,
    toolId: "topic-explainer",
    instruction: (topic, grade) => `Explain it in very simple language for ${grade}: ${topic}. Use short sentences and everyday examples.`,
  },
  {
    id: "examples",
    label: "Examples",
    hint: "Give me examples.",
    icon: ListChecks,
    toolId: "topic-explainer",
    instruction: (topic, grade) => `Give me clear, worked examples of this topic for ${grade}: ${topic}. Use Ghanaian everyday life where helpful.`,
  },
  {
    id: "practice",
    label: "Practice",
    hint: "Give me questions.",
    icon: ClipboardList,
    toolId: "practice-questions",
    instruction: (topic, grade) => `Give me 5 practice questions with worked solutions on this topic for ${grade}: ${topic}.`,
  },
  {
    id: "quiz",
    label: "Quiz",
    hint: "Test me.",
    icon: FileQuestion,
    toolId: "quiz-generator",
    instruction: (topic, grade) => `Test me with a 5-question quiz on this topic for ${grade}: ${topic}. Include an answer key with explanations.`,
  },
  {
    id: "revise",
    label: "Revision",
    hint: "Help me revise.",
    icon: Sparkles,
    toolId: "revision-guide",
    instruction: (topic, grade) => `Help me revise this topic for ${grade}: ${topic}. Key facts, common mistakes and a mini self-test.`,
  },
];

export const StudentMode = memo(function StudentMode({ credits }: StudentModeProps) {
  const { phase, loading, error, result, questions, run, regenerate, clear } = useGigaLearnGeneration();
  const recordAssessment = useMutation(api.gigaLearnProgress.recordAssessment);
  const [ctx, setCtx] = useState<StudioContext>(() => getStudioContext());
  const [changingContext, setChangingContext] = useState(false);
  const [activeAction, setActiveAction] = useState<LearnActionId>("explain");
  const [askInput, setAskInput] = useState("");

  const validation = validateStudioContext(ctx);
  const summary = studioContextSummary(ctx);
  const ids = studioContextIds(ctx);
  const level = getLevel(resolveLegacyLevelId(ctx.levelId));
  const gradeLabel = level?.label ?? "";
  const topic = ctx.topic.trim();
  const action = LEARN_ACTIONS.find((a) => a.id === activeAction)!;
  const activeToolId = action.toolId;
  const isPractice = isInteractivePracticeTool(activeToolId);
  const insufficientCredits = credits != null && credits < 2;

  function updateCtx(patch: Partial<StudioContext>) {
    setCtx(saveStudioContext(patch));
  }

  function payload(prompt: string) {
    const methodologyIds =
      ctx.methodologyIds?.length > 0
        ? ctx.methodologyIds
        : selectMethodologiesForContext({
            levelBand: level?.band,
            subjectId: ctx.subjectId,
            topic,
            max: 6,
          }).map((m) => m.id);
    return {
      toolId: activeToolId,
      prompt,
      curriculum: getCurriculum(ctx.curriculumId)?.label || undefined,
      subject: getSubject(ctx.subjectId)?.label || undefined,
      level: level?.label || undefined,
      country: getCountry(ctx.countryId)?.name || undefined,
      grade: level?.gradeLabel || undefined,
      strand: ctx.strand.trim() || undefined,
      subStrand: ctx.subStrand.trim() || undefined,
      topic: topic || undefined,
      levelId: ids.levelId,
      methodologyIds,
      curriculumIds: {
        countryId: ids.countryId,
        curriculumId: ids.curriculumId,
        levelId: ids.levelId,
        gradeId: ids.gradeId,
        subjectId: ids.subjectId,
        strand: ids.strand || undefined,
        subStrand: ids.subStrand || undefined,
        topic: ids.topic || undefined,
      },
      title: `${action.label}: ${topic || getSubject(ctx.subjectId)?.label || "Untitled"}`,
    };
  }

  function runAction(next: LearnActionId) {
    setActiveAction(next);
    clear();
    const def = LEARN_ACTIONS.find((a) => a.id === next)!;
    void run(payload(def.instruction(topic || getSubject(ctx.subjectId)?.label || "this topic", gradeLabel || "your level")));
  }

  function runAsk() {
    const q = askInput.trim();
    if (!q) return;
    clear();
    void run(payload(`My question about ${topic || getSubject(ctx.subjectId)?.label || "this topic"} (${gradeLabel || "my level"}): ${q}`));
  }

  function recordIdAssessment(score: number) {
    const token = getToken();
    if (!token) return;
    void recordAssessment({
      sessionToken: token,
      topicKey: studioTopicKey(ctx),
      subject: ids.subjectId || undefined,
      curriculum: ids.curriculumId || undefined,
      score,
      toolId: activeToolId,
    }).catch(() => undefined);
  }

  const canRun = validation.valid && Boolean(topic) && !loading && !insufficientCredits;

  return (
    <div className="space-y-4">
      <div className="gigalearn-sticky-context sticky top-0 z-10 rounded-2xl border border-accent/25 bg-white px-3 py-2.5 shadow-sm" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">
            {summary.length ? summary.join(" · ") : "Select your country, curriculum, grade, subject and topic."}
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-9"
            onClick={() => setChangingContext((v) => !v)}
            aria-expanded={changingContext}
          >
            {changingContext ? "Done" : "Change"}
            <ChevronDown className={cn("h-4 w-4", changingContext && "rotate-180")} aria-hidden />
          </Button>
        </div>
        {changingContext && (
          <div className="mt-3 border-t border-border pt-3">
            <CurriculumSelector value={ctx} onChange={(next) => updateCtx(next)} idPrefix="gl-learn" />
          </div>
        )}
      </div>

      {!topic && (
        <p className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-muted" role="note">
          Add a topic above (for example, “Fractions” or “Photosynthesis”), then pick what you want to do.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="toolbar" aria-label="Learning actions">
        {LEARN_ACTIONS.map((a) => {
          const Icon = a.icon;
          const selected = a.id === activeAction;
          return (
            <button
              key={a.id}
              type="button"
              disabled={!canRun}
              onClick={() => runAction(a.id)}
              aria-pressed={selected}
              title={a.hint}
              className={cn(
                "saas-card flex min-h-11 flex-col gap-1 rounded-xl border px-3 py-3 text-left transition-colors disabled:opacity-50",
                selected ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20" : "border-border hover:border-accent/25"
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="h-4 w-4 text-accent" aria-hidden />
                {a.label}
              </span>
              <span className="text-xs text-muted">“{a.hint}”</span>
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor="gl-learn-ask" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
          <MessageCircle className="h-4 w-4" aria-hidden />
          Ask AI about this topic
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="gl-learn-ask"
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runAsk();
            }}
            placeholder={topic ? `Ask anything about ${topic}…` : "Add a topic first, then ask…"}
            disabled={!canRun}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none ring-accent/20 focus:ring-2 disabled:opacity-50"
          />
          <Button type="button" disabled={!canRun || !askInput.trim()} onClick={runAsk} className="min-h-11 sm:shrink-0">
            Ask
          </Button>
        </div>
      </div>

      {insufficientCredits && <CreditPromptLinks creditCost={2} className="text-xs text-amber-700" />}

      <CreatorResultPanel
        content={result}
        loading={loading}
        error={error}
        onRegenerate={() => void regenerate()}
      />

      {isPractice && phase === "success" && questions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Your practice</h3>
            <p className="text-xs text-muted">Answering is free — credits were used for generation only.</p>
          </div>
          <PracticeSession
            questions={questions}
            level={level?.label ?? ""}
            subject={getSubject(ctx.subjectId)?.label ?? ""}
            topic={topic}
            toolId={activeToolId}
            curriculum={getCurriculum(ctx.curriculumId)?.label ?? ""}
            sessionToken={getSessionToken()}
            onComplete={recordIdAssessment}
          />
        </div>
      )}
    </div>
  );
});
