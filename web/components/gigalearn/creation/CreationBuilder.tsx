"use client";

import { CreditPromptLinks } from "@/components/billing/CreditPromptLinks";
import { MessageMarkdown } from "@/components/chat/MessageMarkdown";
import { CreatorResultPanel } from "@/components/creator-studio/CreatorResultPanel";
import { FieldInput } from "@/components/gigalearn/creation/FieldInput";
import { RhymePlayer } from "@/components/gigalearn/rhymes/RhymePlayer";
import { useCreationGeneration } from "@/hooks/useCreationGeneration";
import { deleteCreationDraft, newDraftId, saveCreationDraft } from "@/lib/gigalearn/creation/drafts";
import {
  formatValue,
  hasValue,
  missingRequired,
  normalizeAnswer,
  stageReadiness,
  summaryRows,
  upfrontFields,
  withDefaults,
} from "@/lib/gigalearn/creation/intake";
import {
  DEMONSTRATION_LABEL,
  STRUCTURE_INPUT_KEY,
  assembleDocument,
  buildProvenance,
  continuePrompt,
  deriveSourceReferences,
  provenanceFooter,
} from "@/lib/gigalearn/creation/prompts";
import { stagesFor } from "@/lib/gigalearn/creation/templates";
import type {
  CreationDraft,
  CreationInputs,
  CreationTemplate,
  FieldValue,
  GeneratedSection,
  SourceReference,
} from "@/lib/gigalearn/creation/types";
import { parseGeneratedRhyme } from "@/lib/gigalearn/rhymes/library";
import type { RhymeCategoryId } from "@/lib/gigalearn/rhymes/types";
import { RHYME_CATEGORIES } from "@/lib/gigalearn/rhymes/library";
import { saveArtifact } from "@/lib/gigalearn/workspace";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Loader2, Pencil, RefreshCw, RotateCcw, Save, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type BuilderStep = "intake" | "confirm" | "edit" | "generate";

const STAGE_CREDIT_COST = 2;

type CreationBuilderProps = {
  template: CreationTemplate;
  initialInputs?: CreationInputs;
  initialStep?: BuilderStep;
  initialDraft?: CreationDraft | null;
  extraSourceReferences?: SourceReference[];
  credits: number | null;
  autostart?: boolean;
  onExit: () => void;
};

export function CreationBuilder({
  template,
  initialInputs = {},
  initialStep = "intake",
  initialDraft = null,
  extraSourceReferences = [],
  credits,
  autostart = false,
  onExit,
}: CreationBuilderProps) {
  const { generateStage, loading, error, clearError } = useCreationGeneration();
  const [inputs, setInputs] = useState<CreationInputs>(() =>
    initialDraft ? initialDraft.inputs : initialInputs
  );
  const [step, setStep] = useState<BuilderStep>(() => {
    if (initialDraft) return initialDraft.sections.length ? "generate" : "confirm";
    return initialStep;
  });
  const [visited, setVisited] = useState<string[]>([]);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<FieldValue>("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sections, setSections] = useState<GeneratedSection[]>(initialDraft?.sections ?? []);
  const [activeIndex, setActiveIndex] = useState(() =>
    initialDraft ? Math.max(0, initialDraft.sections.length - 1) : 0
  );
  const [demonstrationData, setDemonstrationData] = useState(initialDraft?.demonstrationData ?? false);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [practisingRhyme, setPractisingRhyme] = useState(false);
  const draftIdRef = useRef(initialDraft?.id ?? newDraftId());
  const createdAtRef = useRef(initialDraft?.createdAt ?? Date.now());
  const savedArtifactRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const autostartedRef = useRef(false);
  const generatingRef = useRef(false);
  const shownStageRef = useRef(activeIndex);

  const extraRefs = initialDraft?.sourceReferences.filter((ref) => ref.kind === "importedReference") ?? extraSourceReferences;
  const sourceReferences = useMemo(
    () => deriveSourceReferences(template, inputs, extraRefs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template, inputs]
  );
  const stages = useMemo(() => stagesFor(template, inputs), [template, inputs]);
  const upfront = useMemo(() => upfrontFields(template), [template]);
  const insufficientCredits = credits != null && credits < STAGE_CREDIT_COST;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // Continue is tapped at the bottom of a long stage; bring the new stage's heading back on screen.
  useEffect(() => {
    if (shownStageRef.current === activeIndex) return;
    shownStageRef.current = activeIndex;
    const heading = headingRef.current;
    if (!heading) return;
    const { top, bottom } = heading.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) heading.scrollIntoView({ block: "start" });
    heading.focus({ preventScroll: true });
  }, [activeIndex]);

  const nextUnvisited = useCallback(
    (values: CreationInputs, seen: string[]) =>
      upfront.find((field) => !seen.includes(field.id) && !hasValue(values[field.id])) ?? null,
    [upfront]
  );

  useEffect(() => {
    if (step !== "intake" || currentFieldId) return;
    const next = nextUnvisited(inputs, visited);
    if (next) {
      setCurrentFieldId(next.id);
      setDraftValue(inputs[next.id] ?? (next.kind === "multichoice" ? [] : ""));
    } else {
      setInputs((values) => withDefaults(template, values));
      setStep("confirm");
    }
  }, [currentFieldId, inputs, nextUnvisited, step, template, visited]);

  const currentField = template.fields.find((field) => field.id === currentFieldId) ?? null;

  const submitAnswer = () => {
    if (!currentField) return;
    const answer = normalizeAnswer(currentField, draftValue);
    if (!answer.ok) {
      setFieldError(answer.error);
      return;
    }
    setFieldError(null);
    setInputs((values) => ({ ...values, [currentField.id]: answer.value }));
    setVisited((seen) => [...seen, currentField.id]);
    setCurrentFieldId(null);
  };

  const skipField = () => {
    if (!currentField || currentField.required) return;
    setFieldError(null);
    setVisited((seen) => [...seen, currentField.id]);
    setCurrentFieldId(null);
  };

  const goBack = () => {
    const previous = visited[visited.length - 1];
    if (!previous) {
      onExit();
      return;
    }
    setVisited((seen) => seen.slice(0, -1));
    setCurrentFieldId(previous);
    setDraftValue(inputs[previous] ?? "");
    setFieldError(null);
  };

  const startOver = () => {
    if (!confirmReset && sections.length > 0) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    deleteCreationDraft(draftIdRef.current);
    setInputs({});
    setSections([]);
    setVisited([]);
    setCurrentFieldId(null);
    setActiveIndex(0);
    setDemonstrationData(false);
    setNotice(null);
    clearError();
    draftIdRef.current = newDraftId();
    createdAtRef.current = Date.now();
    savedArtifactRef.current = false;
    setStep("intake");
  };

  const buildDraft = useCallback(
    (nextSections: GeneratedSection[] = sections): CreationDraft => ({
      id: draftIdRef.current,
      templateId: template.id,
      inputs,
      sections: nextSections,
      sourceReferences,
      demonstrationData,
      provenance: buildProvenance({
        template,
        inputs,
        sections: nextSections,
        sourceReferences,
        createdAt: createdAtRef.current,
      }),
      createdAt: createdAtRef.current,
      updatedAt: Date.now(),
    }),
    [demonstrationData, inputs, sections, sourceReferences, template]
  );

  // Leaving with Android Back or another tab must not discard stages that already cost credits.
  const buildDraftOnLeaveRef = useRef<(() => CreationDraft) | null>(null);
  buildDraftOnLeaveRef.current = sections.some(Boolean) ? () => buildDraft() : null;
  useEffect(
    () => () => {
      const build = buildDraftOnLeaveRef.current;
      if (build) saveCreationDraft(build());
    },
    []
  );

  const saveDraft = (thenExit = false) => {
    const ok = saveCreationDraft(buildDraft());
    setNotice(ok ? "Draft saved on this device." : "Could not save the draft on this device.");
    if (ok && thenExit) onExit();
  };

  const runStage = useCallback(
    async (index: number) => {
      const stage = stages[index];
      if (!stage) return;
      const readiness = stageReadiness(template, stage, inputs, { demonstrationData, sections });
      if (!readiness.ready) return;
      // Two taps can land before React re-renders the hidden controls; one tap = one request.
      if (generatingRef.current) return;
      generatingRef.current = true;
      setNotice(null);
      const previousSections = sections.slice(0, index);
      let section: GeneratedSection | null;
      try {
        section = await generateStage({
          template,
          inputs,
          stage,
          previousSections,
          // Once any section used demonstration data, everything built on it stays labelled.
          demonstrationData: demonstrationData || previousSections.some((entry) => entry?.demonstrationData),
          sourceReferences,
        });
      } finally {
        generatingRef.current = false;
      }
      if (!section) return;
      setSections((current) => {
        const next = [...current];
        next[index] = section;
        return next.slice(0, Math.max(next.length, index + 1));
      });
      setActiveIndex(index);
    },
    [demonstrationData, generateStage, inputs, sections, sourceReferences, stages, template]
  );

  const confirmAndGenerate = useCallback(() => {
    if (missingRequired(template, inputs).length > 0) return;
    setStep("generate");
    setActiveIndex(0);
    void runStage(0);
  }, [inputs, runStage, template]);

  useEffect(() => {
    if (!autostart || autostartedRef.current || step !== "confirm") return;
    autostartedRef.current = true;
    if (!insufficientCredits) confirmAndGenerate();
  }, [autostart, confirmAndGenerate, insufficientCredits, step]);

  const complete = sections.length === stages.length && sections.every(Boolean);
  const documentText = useMemo(
    () => (complete ? assembleDocument(template, sections, sourceReferences) : ""),
    [complete, sections, sourceReferences, template]
  );

  useEffect(() => {
    if (!complete || savedArtifactRef.current) return;
    savedArtifactRef.current = true;
    saveArtifact({
      toolId: template.backendToolId,
      title: `${template.label}: ${formatValue(inputs.title ?? inputs.topic ?? inputs.professionalTitle) || template.documentNoun}`,
      prompt: summaryRows(template, inputs)
        .filter((row) => !template.fields.find((f) => f.id === row.id)?.personalData)
        .map((row) => `${row.label}: ${row.value}`)
        .join("\n"),
      content: documentText,
      subject: formatValue(inputs.subject) || undefined,
      level: formatValue(inputs.level) || undefined,
    });
  }, [complete, documentText, inputs, template]);

  const header = (title: string, subtitle?: string) => (
    <div className="mb-4">
      <button
        type="button"
        onClick={onExit}
        className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All templates
      </button>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        {template.emoji} {template.label}
      </p>
      <h3 ref={headingRef} tabIndex={-1} className="mt-1 scroll-mt-20 text-lg font-semibold text-foreground outline-none">
        {title}
      </h3>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );

  const controlsRow = (children: React.ReactNode) => <div className="mt-4 flex flex-wrap gap-2">{children}</div>;
  const btn = "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50";
  const primary = cn(btn, "bg-accent text-accent-foreground");
  const secondary = cn(btn, "border border-border bg-white text-foreground");

  if (step === "intake") {
    if (!currentField) return <div aria-busy="true" />;
    const position = upfront.findIndex((field) => field.id === currentField.id) + 1;
    return (
      <div>
        {header(currentField.question, currentField.hint)}
        <p className="mb-2 text-xs text-muted" aria-live="polite">
          Question {position} of {upfront.length}
          {currentField.required ? "" : " · optional"}
        </p>
        <label id={`intake-${currentField.id}-label`} htmlFor={`intake-${currentField.id}`} className="sr-only">
          {currentField.question}
        </label>
        <FieldInput
          field={currentField}
          value={draftValue}
          onChange={(value) => {
            setDraftValue(value);
            setFieldError(null);
          }}
          inputId={`intake-${currentField.id}`}
          autoFocus
          onSubmit={submitAnswer}
        />
        {fieldError ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {fieldError}
          </p>
        ) : null}
        {controlsRow(
          <>
            <button type="button" onClick={goBack} className={secondary}>
              Back
            </button>
            {!currentField.required ? (
              <button type="button" onClick={skipField} className={secondary}>
                Skip
              </button>
            ) : null}
            <button type="button" onClick={submitAnswer} className={primary}>
              Next
            </button>
          </>
        )}
      </div>
    );
  }

  if (step === "edit") {
    const missing = missingRequired(template, inputs);
    return (
      <div>
        {header("Edit details", "Change anything below, then review before generating.")}
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (missing.length === 0) setStep(sections.length ? "generate" : "confirm");
          }}
        >
          {template.fields.map((field) => (
            <div key={field.id}>
              <label
                id={`edit-${field.id}-label`}
                htmlFor={`edit-${field.id}`}
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                {field.label}
                {field.required ? <span className="text-red-600"> *</span> : null}
              </label>
              <FieldInput
                field={field}
                value={inputs[field.id]}
                onChange={(value) => setInputs((values) => ({ ...values, [field.id]: value }))}
                inputId={`edit-${field.id}`}
              />
            </div>
          ))}
          {missing.length ? (
            <p role="alert" className="text-sm text-red-600">
              Still needed: {missing.map((field) => field.label).join(", ")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={missing.length > 0} className={primary}>
              <Check className="h-4 w-4" aria-hidden />
              Save details
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (step === "confirm") {
    const rows = summaryRows(template, inputs);
    const missing = missingRequired(template, inputs);
    const structure = inputs[STRUCTURE_INPUT_KEY];
    return (
      <div>
        {header("Ready to Generate", "Does this information look correct?")}
        <dl className="divide-y divide-border rounded-2xl border border-border">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 px-4 py-2.5 text-sm">
              <dt className="font-medium text-muted">{row.label}</dt>
              <dd className="whitespace-pre-wrap break-words text-foreground">{row.value}</dd>
            </div>
          ))}
          {hasValue(structure) ? (
            <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 px-4 py-2.5 text-sm">
              <dt className="font-medium text-muted">Structure</dt>
              <dd className="text-foreground">From your reference (headings only)</dd>
            </div>
          ) : null}
        </dl>
        {missing.length ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            Still needed before generating: {missing.map((field) => field.label).join(", ")}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          {stages.length > 1
            ? `Giga3 will write this in ${stages.length} stages and ask before each one. `
            : ""}
          Each generation uses {STAGE_CREDIT_COST} credits.
        </p>
        {insufficientCredits ? (
          <CreditPromptLinks creditCost={STAGE_CREDIT_COST} className="mt-2 text-xs text-amber-700" />
        ) : null}
        {controlsRow(
          <>
            <button
              type="button"
              onClick={confirmAndGenerate}
              disabled={missing.length > 0 || insufficientCredits || loading}
              className={primary}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Confirm &amp; Generate
            </button>
            <button type="button" onClick={() => setStep("edit")} className={secondary}>
              <Pencil className="h-4 w-4" aria-hidden />
              Edit Details
            </button>
            <button type="button" onClick={startOver} className={secondary}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Start Over
            </button>
          </>
        )}
      </div>
    );
  }

  const stage = stages[activeIndex]!;
  const section = sections[activeIndex];
  const readiness = stageReadiness(template, stage, inputs, { demonstrationData, sections });
  const nextStage = stages[activeIndex + 1];
  const rhymeMeta =
    template.id === "rhyme" && section
      ? parseGeneratedRhyme(section.content, {
          category:
            RHYME_CATEGORIES.find((category) => category.label === formatValue(inputs.category))?.id ??
            ("nature-environment" as RhymeCategoryId),
          ageRange: formatValue(inputs.ageRange),
          learningObjective: formatValue(inputs.learningObjective),
          language: formatValue(inputs.language) || "English",
          culturalContext: formatValue(inputs.culturalContext),
        })
      : null;

  if (practisingRhyme && rhymeMeta) {
    return <RhymePlayer rhyme={rhymeMeta} onBack={() => setPractisingRhyme(false)} onPractised={() => undefined} />;
  }

  return (
    <div>
      {header(
        stages.length > 1
          ? `Stage ${activeIndex + 1} of ${stages.length}: ${capitalize(stage.label)}`
          : `Your ${template.documentNoun}`,
        stage.sections.join(" · ")
      )}

      {stages.length > 1 ? (
        <ol className="mb-4 flex gap-1.5 overflow-x-auto pb-1" aria-label="Stages">
          {stages.map((candidate, index) => {
            const done = Boolean(sections[index]);
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  disabled={!done && index !== sections.length}
                  aria-current={index === activeIndex ? "step" : undefined}
                  onClick={() => {
                    setEditingText(null);
                    setActiveIndex(index);
                  }}
                  className={cn(
                    "min-h-11 min-w-11 rounded-full border px-3 text-xs font-semibold disabled:opacity-40",
                    index === activeIndex
                      ? "border-accent bg-accent text-accent-foreground"
                      : done
                        ? "border-emerald-500 text-emerald-700"
                        : "border-border text-muted"
                  )}
                  aria-label={`Stage ${index + 1}: ${candidate.label}${done ? " (done)" : ""}`}
                >
                  {done ? "✓" : index + 1}
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}

      {loading ? (
        <div className="flex min-h-[8rem] items-center justify-center gap-2 rounded-2xl border border-border text-sm text-muted" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Generating {stage.label}…
        </div>
      ) : section ? (
        editingText != null ? (
          <div>
            <label htmlFor="edit-section-text" className="mb-1.5 block text-sm font-medium text-foreground">
              Edit this section
            </label>
            <textarea
              id="edit-section-text"
              value={editingText}
              onChange={(event) => setEditingText(event.target.value)}
              rows={14}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
            />
            {controlsRow(
              <>
                <button
                  type="button"
                  className={primary}
                  onClick={() => {
                    setSections((current) =>
                      current.map((entry, index) => (index === activeIndex ? { ...entry, content: editingText } : entry))
                    );
                    setEditingText(null);
                  }}
                >
                  Save edits
                </button>
                <button type="button" className={secondary} onClick={() => setEditingText(null)}>
                  Cancel
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white p-4">
            {section.demonstrationData ? (
              <p className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
                {DEMONSTRATION_LABEL}
              </p>
            ) : null}
            <MessageMarkdown content={section.content} />
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-4">
          {readiness.ready ? (
            <p className="text-sm text-foreground">
              {continuePrompt(stage) ?? "Ready to generate."}
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground" role="status">
                {readiness.message}
              </p>
              {readiness.reason === "missingFields"
                ? readiness.missing.map((field) => (
                    <div key={field.id}>
                      <label
                        id={`stage-${field.id}-label`}
                        htmlFor={`stage-${field.id}`}
                        className="mb-1.5 block text-sm text-foreground"
                      >
                        {field.question}
                      </label>
                      <FieldInput
                        field={field}
                        value={inputs[field.id]}
                        onChange={(value) => setInputs((values) => ({ ...values, [field.id]: value }))}
                        inputId={`stage-${field.id}`}
                      />
                    </div>
                  ))
                : null}
            </div>
          )}
          {stage.userDataStage ? (
            <label className="mt-3 flex min-h-11 items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={demonstrationData}
                onChange={(event) => setDemonstrationData(event.target.checked)}
              />
              <span>
                I don&apos;t have real data yet — show a clearly labelled demonstration instead.
                <span className="mt-0.5 block text-xs font-semibold text-amber-800">
                  Every demonstration section is marked &ldquo;{DEMONSTRATION_LABEL}&rdquo;.
                </span>
              </span>
            </label>
          ) : null}
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {insufficientCredits ? (
        <CreditPromptLinks creditCost={STAGE_CREDIT_COST} className="mt-2 text-xs text-amber-700" />
      ) : null}

      {!loading && editingText == null
        ? controlsRow(
            <>
              {!section ? (
                <button
                  type="button"
                  className={primary}
                  disabled={!readiness.ready || insufficientCredits}
                  onClick={() => void runStage(activeIndex)}
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Generate
                </button>
              ) : (
                <>
                  {nextStage && !sections[activeIndex + 1] ? (
                    <button
                      type="button"
                      className={primary}
                      disabled={insufficientCredits}
                      title={continuePrompt(nextStage) ?? undefined}
                      onClick={() => {
                        const nextIndex = activeIndex + 1;
                        setActiveIndex(nextIndex);
                        const ready = stageReadiness(template, nextStage, inputs, { demonstrationData, sections });
                        if (ready.ready) void runStage(nextIndex);
                      }}
                    >
                      Continue
                    </button>
                  ) : null}
                  <button type="button" className={secondary} onClick={() => setEditingText(section.content)}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit
                  </button>
                  <button
                    type="button"
                    className={secondary}
                    disabled={insufficientCredits}
                    onClick={() => void runStage(activeIndex)}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Regenerate
                  </button>
                  {rhymeMeta ? (
                    <button type="button" className={secondary} onClick={() => setPractisingRhyme(true)}>
                      🎵 Practise this rhyme
                    </button>
                  ) : null}
                </>
              )}
              <button type="button" className={secondary} onClick={() => setStep("edit")}>
                Edit Details
              </button>
              <button type="button" className={secondary} onClick={() => saveDraft(false)}>
                <Save className="h-4 w-4" aria-hidden />
                Save Draft
              </button>
              {stages.length > 1 ? (
                <button type="button" className={secondary} onClick={() => saveDraft(true)}>
                  Continue Later
                </button>
              ) : null}
              <button type="button" className={secondary} onClick={startOver}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                {confirmReset ? "Tap again to start over" : "Start Over"}
              </button>
            </>
          )
        : null}

      {section && nextStage && !sections[activeIndex + 1] && !loading ? (
        <p className="mt-2 text-sm text-muted">{continuePrompt(nextStage)}</p>
      ) : null}
      {notice ? (
        <p className="mt-2 text-sm text-emerald-700" role="status">
          {notice}
        </p>
      ) : null}

      {complete ? (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Complete {template.documentNoun}</h4>
          <CreatorResultPanel content={documentText} publishKind="blog" />
          <details className="rounded-2xl border border-border p-4 text-xs text-muted">
            <summary className="min-h-11 cursor-pointer text-sm font-medium text-foreground">Content provenance</summary>
            <ProvenanceDetails draft={buildDraft()} footer={provenanceFooter(template, sourceReferences)} />
          </details>
        </div>
      ) : null}
    </div>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ProvenanceDetails({ draft, footer }: { draft: CreationDraft; footer: string }) {
  const provenance = draft.provenance!;
  return (
    <dl className="mt-2 grid grid-cols-[minmax(0,10rem)_1fr] gap-x-3 gap-y-1">
      <dt>Label</dt>
      <dd className="text-foreground">{footer}</dd>
      <dt>Generation type</dt>
      <dd className="text-foreground">{provenance.generationType}</dd>
      <dt>Original content</dt>
      <dd className="text-foreground">{provenance.originalContent ? "Yes" : "No"}</dd>
      <dt>External sources supplied</dt>
      <dd className="text-foreground">
        {provenance.externalSourcesSupplied
          ? provenance.sourceReferences.map((ref) => `${ref.title} (${ref.usedAs})`).join("; ")
          : "No"}
      </dd>
      <dt>Citations requested</dt>
      <dd className="text-foreground">{provenance.citationsRequested ? "Yes" : "No"}</dd>
      <dt>Sections</dt>
      <dd className="text-foreground">
        {provenance.generatedSections
          .map(
            (section) =>
              `${section.label} — ${new Date(section.generatedAt).toLocaleString()}${section.demonstrationData ? " (demonstration data)" : ""}`
          )
          .join("; ")}
      </dd>
    </dl>
  );
}
