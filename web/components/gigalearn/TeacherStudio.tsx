"use client";

import { CreditPromptLinks } from "@/components/billing/CreditPromptLinks";
import { CreatorResultPanel } from "@/components/creator-studio/CreatorResultPanel";
import { CurriculumSelector } from "@/components/gigalearn/CurriculumSelector";
import { FlashcardStudy } from "@/components/gigalearn/FlashcardStudy";
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
  subjectPlaceholder,
} from "@/lib/gigalearn/curriculumEngine";
import { parseFlashcards } from "@/lib/gigalearn/flashcards";
import { isInteractivePracticeTool } from "@/lib/gigalearn/questions";
import { buildRepurposePrompt, extractNarrationScript, repurposeTargetsFor } from "@/lib/gigalearn/repurpose";
import {
  getStudioContext,
  saveStudioContext,
  studioContextIds,
  studioContextSummary,
  studioTopicKey,
  validateStudioContext,
  type StudioContext,
} from "@/lib/gigalearn/studioContext";
import {
  QUIZ_DIFFICULTIES,
  QUIZ_QUESTION_COUNTS,
  QUIZ_QUESTION_TYPES,
  studioToolsFor,
  type QuizDifficulty,
  type QuizQuestionType,
  type StudioToolDefinition,
} from "@/lib/gigalearn/studioTools";
import { saveTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { saveArtifact } from "@/lib/gigalearn/workspace";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { ChevronDown, Clapperboard, Loader2, Pencil, Presentation, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useMemo, useState } from "react";

interface TeacherStudioProps {
  credits: number | null;
}

const FOLLOW_UPS = [
  { id: "expand", label: "Expand", instruction: "Expand the content below with more detail, examples and activities. Keep the same curriculum context and structure." },
  { id: "simplify", label: "Simplify", instruction: "Simplify the content below for a younger reading level while keeping every key fact. Keep the same curriculum context and structure." },
  { id: "translate", label: "Translate", instruction: "Rewrite the content below in simple Ghanaian classroom English with local examples where helpful. Keep the same curriculum context and structure." },
] as const;

export const TeacherStudio = memo(function TeacherStudio({ credits }: TeacherStudioProps) {
  const router = useRouter();
  const { phase, loading, error, result, questions, run, regenerate, clear } = useGigaLearnGeneration();
  const recordAssessment = useMutation(api.gigaLearnProgress.recordAssessment);
  const teacherTools = useMemo(() => studioToolsFor("teacher"), []);

  const [ctx, setCtx] = useState<StudioContext>(() => getStudioContext());
  const [changingContext, setChangingContext] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string>("lesson-generator");
  const [request, setRequest] = useState("");
  const [objective, setObjective] = useState("");
  const [duration, setDuration] = useState("60 minutes");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("Mixed");
  const [questionTypes, setQuestionTypes] = useState<QuizQuestionType[]>(["Multiple choice", "True/False"]);
  const [repurposeOpen, setRepurposeOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeTool: StudioToolDefinition = teacherTools.find((t) => t.id === activeToolId) ?? teacherTools[0]!;
  const validation = validateStudioContext(ctx);
  const summary = studioContextSummary(ctx);
  const ids = studioContextIds(ctx);
  const insufficientCredits = credits != null && credits < activeTool.creditCost;
  const isPracticeTool = isInteractivePracticeTool(activeTool.backendToolId);
  const showAssessmentOptions =
    activeTool.id === "quiz-generator" || activeTool.id === "assessment-generator" || activeTool.id === "bece-mock";
  const showFlashcards = activeTool.id === "flashcard-generator" && phase === "success" && result;
  const flashcardList = useMemo(() => (showFlashcards && result ? parseFlashcards(result) : []), [showFlashcards, result]);

  function updateCtx(patch: Partial<StudioContext>) {
    setCtx(saveStudioContext(patch));
  }

  function labels() {
    return {
      country: getCountry(ctx.countryId)?.name ?? "",
      curriculum: getCurriculum(ctx.curriculumId)?.label ?? "",
      level: getLevel(resolveLegacyLevelId(ctx.levelId))?.label ?? "",
      grade: getLevel(resolveLegacyLevelId(ctx.levelId))?.gradeLabel ?? "",
      subject: getSubject(ctx.subjectId)?.label ?? "",
    };
  }

  function basePayload() {
    const l = labels();
    return {
      toolId: activeTool.backendToolId,
      curriculum: l.curriculum || undefined,
      subject: l.subject || undefined,
      level: l.level || undefined,
      country: l.country || undefined,
      grade: l.grade || undefined,
      strand: ctx.strand.trim() || undefined,
      subStrand: ctx.subStrand.trim() || undefined,
      topic: ctx.topic.trim() || undefined,
      learningObjective: objective.trim() || undefined,
      contentStandard: ctx.contentStandard.trim() || undefined,
      indicator: ctx.indicator.trim() || undefined,
      curriculumIds: {
        countryId: ids.countryId,
        curriculumId: ids.curriculumId,
        levelId: ids.levelId,
        gradeId: ids.gradeId,
        subjectId: ids.subjectId,
        strand: ids.strand || undefined,
        subStrand: ids.subStrand || undefined,
        topic: ids.topic || undefined,
        contentStandard: ids.contentStandard || undefined,
        indicator: ids.indicator || undefined,
      },
      resourceType: activeTool.id as "lesson" | "notes" | "quiz" | "assignment" | "worksheet" | "assessment" | "presentation" | "video" | "flashcard" | "practical" | "revision" | "study-plan" | "other",
      title: `${activeTool.label}: ${ctx.topic.trim() || getSubject(ctx.subjectId)?.label || "Untitled"}`,
    };
  }

  function buildPrompt(): string {
    const bits = [request.trim()];
    if (activeTool.id === "lesson-generator" && duration.trim()) {
      bits.push(`Lesson duration: ${duration.trim()}.`);
    }
    if (showAssessmentOptions) {
      bits.push(
        `Generate ${questionCount} questions at ${difficulty} difficulty using these question types: ${questionTypes.join(", ") || "Mixed"}.`
      );
    }
    return bits.filter(Boolean).join("\n\n");
  }

  function handleGenerate() {
    setNotice(null);
    setRepurposeOpen(false);
    setEditing(null);
    void run({ ...basePayload(), prompt: buildPrompt(), context: undefined });
  }

  function handleFollowUp(instruction: string) {
    if (!result) return;
    void run({
      ...basePayload(),
      prompt: `${instruction}\n\nContent to transform:\n${(editing ?? result).slice(0, 10000)}`,
      context: undefined,
    });
  }

  function handleRepurpose(targetId: Parameters<typeof buildRepurposePrompt>[0]["targetId"]) {
    const source = editing ?? result;
    if (!source) return;
    const { prompt, backendToolId } = buildRepurposePrompt({
      sourceLabel: activeTool.label,
      targetId,
      sourceContent: source,
      context: ctx,
    });
    setRepurposeOpen(false);
    void run({ ...basePayload(), toolId: backendToolId, prompt, context: undefined });
  }

  function handleSaveEdited() {
    const content = (editing ?? result ?? "").trim();
    if (!content) return;
    saveArtifact({
      toolId: activeTool.backendToolId,
      title: `${activeTool.label} (edited): ${ctx.topic.trim() || getSubject(ctx.subjectId)?.label || "Untitled"}`,
      prompt: request,
      content,
      curriculum: labels().curriculum || undefined,
      subject: labels().subject || undefined,
      level: labels().level || undefined,
      curriculumIds: basePayload().curriculumIds,
      resourceType: basePayload().resourceType,
      topic: ctx.topic.trim() || undefined,
    });
    setEditing(null);
    setNotice("Saved to your resource library.");
  }

  function handleExport() {
    const content = editing ?? result ?? "";
    if (!content.trim()) return;
    const blob = new Blob([`# ${activeTool.label}\n\n${summary.join(" · ")}\n\n${content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTool.id}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function handleSendToVideo() {
    const source = editing ?? result ?? "";
    if (!source.trim()) return;
    saveTeleprompterScript(extractNarrationScript(source));
    router.push("/gigaedit");
  }

  function recordIdAssessment(score: number) {
    const token = getSessionToken();
    if (!token) return;
    void recordAssessment({
      sessionToken: token,
      topicKey: studioTopicKey(ctx),
      subject: ids.subjectId || undefined,
      curriculum: ids.curriculumId || undefined,
      score,
      toolId: activeTool.backendToolId,
    }).catch(() => undefined);
  }

  return (
    <div className="space-y-4">
      {/* Persistent curriculum breadcrumb — visible while generating. */}
      <div
        className="sticky top-0 z-10 rounded-2xl border border-accent/25 bg-white/95 px-3 py-2.5 shadow-sm"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">
            {summary.length ? summary.join(" · ") : "Select your curriculum context to begin."}
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-9"
            onClick={() => setChangingContext((v) => !v)}
            aria-expanded={changingContext}
          >
            {changingContext ? "Done" : "Change curriculum"}
            <ChevronDown className={cn("h-4 w-4", changingContext && "rotate-180")} aria-hidden />
          </Button>
        </div>
        {changingContext && (
          <div className="mt-3 border-t border-border pt-3">
            <CurriculumSelector
              value={ctx}
              onChange={(next) => updateCtx(next)}
              idPrefix="gl-studio"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="gl-studio-standard" className="mb-1.5 block text-xs font-medium text-muted">
                  Content Standard (optional)
                </label>
                <input
                  id="gl-studio-standard"
                  value={ctx.contentStandard}
                  onChange={(e) => updateCtx({ contentStandard: e.target.value })}
                  placeholder="e.g. from your NaCCA curriculum"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="gl-studio-indicator" className="mb-1.5 block text-xs font-medium text-muted">
                  Indicator (optional)
                </label>
                <input
                  id="gl-studio-indicator"
                  value={ctx.indicator}
                  onChange={(e) => updateCtx({ indicator: e.target.value })}
                  placeholder="e.g. indicator code or text"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {!validation.valid && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="alert">
          Complete your curriculum context to generate: {validation.issues.join(" ")}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {teacherTools.map((tool) => {
          const Icon = tool.icon;
          const selected = tool.id === activeToolId;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                setActiveToolId(tool.id);
                setRepurposeOpen(false);
                clear();
              }}
              aria-pressed={selected}
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

      {activeTool.id === "lesson-generator" && (
        <div>
          <label htmlFor="gl-studio-duration" className="mb-1.5 block text-xs font-medium text-muted">
            Lesson duration
          </label>
          <input
            id="gl-studio-duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 60 minutes"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm sm:max-w-xs"
          />
        </div>
      )}

      {showAssessmentOptions && (
        <fieldset className="space-y-3 rounded-2xl border border-border p-3">
          <legend className="px-1 text-xs font-medium text-muted">Assessment options</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="gl-studio-qcount" className="mb-1.5 block text-xs font-medium text-muted">
                Number of questions
              </label>
              <select
                id="gl-studio-qcount"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm min-h-11"
              >
                {QUIZ_QUESTION_COUNTS.map((n) => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gl-studio-difficulty" className="mb-1.5 block text-xs font-medium text-muted">
                Difficulty
              </label>
              <select
                id="gl-studio-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm min-h-11"
              >
                {QUIZ_DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted" id="gl-studio-qtypes-label">
                Question types
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="gl-studio-qtypes-label">
                {QUIZ_QUESTION_TYPES.map((t) => {
                  const on = questionTypes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setQuestionTypes((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))
                      }
                      className={cn(
                        "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium",
                        on ? "border-accent/50 bg-accent/10 text-foreground" : "border-border text-muted"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="gl-studio-objective" className="mb-2 block text-sm font-medium text-muted">
          Learning objective (optional)
        </label>
        <input
          id="gl-studio-objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="e.g. Learners can prepare a simple budget for a class project"
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none ring-accent/20 focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="gl-studio-request" className="mb-2 block text-sm font-medium text-muted">
          Your request
        </label>
        <textarea
          id="gl-studio-request"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={4}
          placeholder={ctx.subjectId ? subjectPlaceholder(ctx.subjectId) : "Describe the lesson, activity or assessment you need…"}
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none ring-accent/20 focus:ring-2"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={loading || insufficientCredits || !validation.valid || !request.trim()}
          onClick={handleGenerate}
          className="min-h-11"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          Generate {activeTool.label}
        </Button>
        {insufficientCredits && (
          <CreditPromptLinks creditCost={activeTool.creditCost} className="text-xs text-amber-700" />
        )}
        {phase === "success" && <p className="text-xs text-muted">Saved to your resource library.</p>}
      </div>

      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900" role="status">
          {notice}
        </p>
      )}

      {/* Result actions: edit / regenerate / expand / simplify / translate / save / export / repurpose / video */}
      {phase === "success" && result && (
        <div className="space-y-3">
          <p className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-xs font-medium text-foreground" aria-live="polite">
            {summary.join(" · ")}
          </p>
          <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Resource actions">
            <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => setEditing(editing === null ? result : null)}>
              <Pencil className="h-4 w-4" aria-hidden />
              {editing === null ? "Edit" : "Cancel edit"}
            </Button>
            {editing !== null && (
              <Button type="button" size="sm" className="min-h-11" onClick={handleSaveEdited}>
                <Save className="h-4 w-4" aria-hidden />
                Save edits
              </Button>
            )}
            {FOLLOW_UPS.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant="secondary"
                className="min-h-11"
                disabled={loading}
                onClick={() => handleFollowUp(f.instruction)}
              >
                {f.label}
              </Button>
            ))}
            <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={handleExport}>
              Export
            </Button>
            <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => window.print()}>
              Print
            </Button>
            <div className="relative">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="min-h-11"
                aria-expanded={repurposeOpen}
                aria-haspopup="menu"
                onClick={() => setRepurposeOpen((v) => !v)}
              >
                Repurpose
                <ChevronDown className={cn("h-4 w-4", repurposeOpen && "rotate-180")} aria-hidden />
              </Button>
              {repurposeOpen && (
                <div role="menu" aria-label="Repurpose into" className="absolute z-20 mt-2 w-64 rounded-2xl border border-border bg-white p-2 shadow-lg">
                  {repurposeTargetsFor(activeTool.backendToolId).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="menuitem"
                      disabled={loading}
                      onClick={() => handleRepurpose(t.id)}
                      className="flex min-h-11 w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-accent/5"
                    >
                      <span className="text-sm font-medium text-foreground">{t.label}</span>
                      <span className="text-xs text-muted">{t.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => handleRepurpose("presentation-generator")}>
              <Presentation className="h-4 w-4" aria-hidden />
              To presentation
            </Button>
            <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={handleSendToVideo}>
              <Clapperboard className="h-4 w-4" aria-hidden />
              To video
            </Button>
          </div>

          {editing !== null ? (
            <div>
              <label htmlFor="gl-studio-edit" className="mb-1.5 block text-sm font-medium text-foreground">
                Edit this {activeTool.label.toLowerCase()}
              </label>
              <textarea
                id="gl-studio-edit"
                value={editing}
                onChange={(e) => setEditing(e.target.value)}
                rows={16}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              />
            </div>
          ) : (
            <CreatorResultPanel content={result} loading={loading} error={error} onRegenerate={() => void regenerate()} />
          )}

          {showFlashcards && flashcardList.length > 0 && (
            <FlashcardStudy cards={flashcardList} deckId={`${ids.subjectId}::${ids.levelId}::${ids.topic || activeTool.id}`} />
          )}

          {isPracticeTool && questions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Interactive practice</h3>
                <p className="text-xs text-muted">Answering is free — credits were used for generation only.</p>
              </div>
              <PracticeSession
                questions={questions}
                level={labels().level}
                subject={labels().subject}
                topic={ctx.topic.trim() || labels().subject}
                toolId={activeTool.backendToolId}
                curriculum={labels().curriculum}
                sessionToken={getSessionToken()}
                onComplete={recordIdAssessment}
              />
            </div>
          )}
        </div>
      )}

      {phase !== "success" && (
        <CreatorResultPanel content={result} loading={loading} error={error} onRegenerate={() => void regenerate()} />
      )}
    </div>
  );
});
