"use client";

import { CreditPromptLinks } from "@/components/billing/CreditPromptLinks";
import { StudioContextBar } from "@/components/gigalearn/StudioContextBar";
import { Button } from "@/components/ui/Button";
import { useTutorSession } from "@/hooks/useTutorSession";
import { getSessionToken } from "@/lib/auth";
import {
  getCountry,
  getCurriculum,
  getLevel,
  getSubject,
  resolveLegacyLevelId,
} from "@/lib/gigalearn/curriculumEngine";
import {
  getStudioContext,
  saveStudioContext,
  studioContextIds,
  validateStudioContext,
  type StudioContext,
} from "@/lib/gigalearn/studioContext";
import { performanceSummaryForTutor } from "@/lib/gigalearn/recommendations";
import { logSignal } from "@/lib/gigalearn/signals";
import { cn } from "@/lib/utils";
import { BookOpen, FlaskConical, GraduationCap, HelpCircle, Lightbulb, ListChecks, MessageCircle, Sparkles, Target, Telescope } from "lucide-react";
import { memo, useRef, useState } from "react";

/** Only auto-scroll when the user is already near the bottom — avoids mobile jump fights. */
function scrollTutorEndIfNear(anchor: HTMLElement | null) {
  if (!anchor || typeof window === "undefined") return;
  const rect = anchor.getBoundingClientRect();
  const nearBottom = rect.top <= window.innerHeight + 96;
  if (nearBottom) {
    anchor.scrollIntoView({ block: "end", behavior: "auto" });
  }
}

interface AdaptiveTutorProps {
  credits: number | null;
}

type TutorAction = "explain" | "simplify" | "example" | "hint" | "check" | "practice" | "correct" | "challenge";

const TUTOR_ACTIONS: Array<{ id: TutorAction; label: string; icon: typeof Lightbulb; hint: string }> = [
  { id: "explain", label: "Explain", icon: Lightbulb, hint: "Explain the concept at my level" },
  { id: "simplify", label: "Simplify", icon: BookOpen, hint: "Simpler explanation" },
  { id: "example", label: "Example", icon: ListChecks, hint: "Give an appropriate example" },
  { id: "hint", label: "Hint", icon: HelpCircle, hint: "Guide me without the answer" },
  { id: "check", label: "Check me", icon: Target, hint: "Ask a targeted question" },
  { id: "practice", label: "Practice", icon: FlaskConical, hint: "Generate another question" },
  { id: "correct", label: "Correct me", icon: MessageCircle, hint: "Explain my incorrect response" },
  { id: "challenge", label: "Challenge", icon: Telescope, hint: "Increase difficulty" },
];

export const AdaptiveTutor = memo(function AdaptiveTutor({ credits }: AdaptiveTutorProps) {
  const [ctx, setCtx] = useState<StudioContext>(() => getStudioContext());
  const [socratic, setSocratic] = useState(false);
  const [input, setInput] = useState("");
  const [lastAction, setLastAction] = useState<TutorAction | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const validation = validateStudioContext(ctx);
  const ids = studioContextIds(ctx);
  const level = getLevel(resolveLegacyLevelId(ctx.levelId));
  const insufficientCredits = credits != null && credits < 1;

  const contextPayload = {
    country: getCountry(ctx.countryId)?.name,
    curriculum: getCurriculum(ctx.curriculumId)?.label,
    level: level?.label,
    grade: level?.gradeLabel,
    subject: getSubject(ctx.subjectId)?.label,
    strand: ctx.strand.trim() || undefined,
    subStrand: ctx.subStrand.trim() || undefined,
    contentStandard: ctx.contentStandard.trim() || undefined,
    indicator: ctx.indicator.trim() || undefined,
    topic: ctx.topic.trim() || undefined,
    countryId: ids.countryId || undefined,
    curriculumId: ids.curriculumId || undefined,
    levelId: ids.levelId || undefined,
    subjectId: ids.subjectId || undefined,
    methodologyIds: ctx.methodologyIds?.length ? [...ctx.methodologyIds] : undefined,
  };

  const sessionToken = getSessionToken();
  const { messages, loading, error, send, reset } = useTutorSession({
    sessionToken,
    context: contextPayload,
    getPerformanceSummary: () => performanceSummaryForTutor({ subjectId: ids.subjectId, topic: ids.topic }),
  });

  const canSend = validation.valid && !loading && !insufficientCredits && Boolean(sessionToken);

  function afterSend(mode: string) {
    logSignal({
      type: mode === "hint" ? "hint-used" : "tutor-turn",
      subjectId: ids.subjectId,
      levelId: ids.levelId,
      gradeId: ids.gradeId,
      strand: ids.strand,
      subStrand: ids.subStrand,
      topic: ids.topic,
      indicator: ids.indicator,
      score: null,
      correct: null,
      detail: mode,
    });
    requestAnimationFrame(() => scrollTutorEndIfNear(bottomRef.current));
  }

  function sendAction(action: TutorAction) {
    const topic = ids.topic || getSubject(ctx.subjectId)?.label || "this topic";
    const prompts: Record<TutorAction, string> = {
      explain: `Explain ${topic} at my level.`,
      simplify: `Give me a simpler explanation of ${topic}.`,
      example: `Give me an appropriate example for ${topic}.`,
      hint: `Give me a hint for ${topic} without revealing the answer.`,
      check: `Check my understanding of ${topic} with one question.`,
      practice: `Give me another practice question on ${topic}.`,
      correct: `I answered a question on ${topic} incorrectly — explain what I likely got wrong and how to fix it. My attempt: ${input.trim() || "(see conversation)"}`,
      challenge: `Challenge me on ${topic} — I am ready for something harder.`,
    };
    setLastAction(action);
    void send(socratic && action !== "correct" ? "socratic" : action, prompts[action]).then(() => afterSend(action));
  }

  function sendFree() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    void send(socratic ? "socratic" : "ask", text).then(() => afterSend("ask"));
  }

  return (
    <div className="space-y-4">
      <StudioContextBar ctx={ctx} onChange={(next) => setCtx(next)} idPrefix="gl-tutor" changeLabel="Change context" />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-white px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-foreground">Socratic mode {socratic ? "on" : "off"}</p>
          <p className="text-xs text-muted">
            {socratic
              ? "Guiding questions first — answers only when earned. Understanding over answer copying."
              : "Direct explanations with examples."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={socratic}
          aria-label="Toggle Socratic tutoring mode"
          onClick={() => setSocratic((v) => !v)}
          className={cn(
            "relative min-h-9 w-14 shrink-0 rounded-full border transition-colors",
            socratic ? "border-accent/50 bg-accent/20" : "border-border bg-slate-100"
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow transition-all",
              socratic ? "left-[calc(100%-1.75rem)] border border-accent/50" : "left-1 border border-border"
            )}
            aria-hidden
          />
        </button>
      </div>

      {!validation.valid && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="alert">
          Set your curriculum context to start: {validation.issues.join(" ")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="toolbar" aria-label="Tutor actions">
        {TUTOR_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              disabled={!canSend}
              onClick={() => sendAction(a.id)}
              title={a.hint}
              aria-pressed={lastAction === a.id}
              className={cn(
                "saas-card flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors disabled:opacity-50",
                lastAction === a.id ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20 text-foreground" : "border-border text-foreground hover:border-accent/25"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              {a.label}
            </button>
          );
        })}
      </div>

      <section aria-label="Tutor conversation" aria-live="polite" className="space-y-3">
        {messages.length === 0 && (
          <div className="saas-card rounded-2xl border border-dashed border-border p-6 text-center">
            <GraduationCap className="mx-auto h-8 w-8 text-accent" aria-hidden />
            <p className="mt-2 text-sm font-medium text-foreground">Your adaptive tutor is ready</p>
            <p className="mt-1 text-xs text-muted">
              Pick an action above or ask anything — it knows your curriculum, grade and recent performance.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "bg-accent/10 text-foreground" : "border border-border bg-white text-foreground"
              )}
            >
              {m.role === "assistant" && (
                <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Tutor · {m.mode}
                </p>
              )}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start" role="status">
            <p className="animate-pulse rounded-2xl border border-border bg-white px-3 py-2.5 text-sm text-muted">
              Tutor is thinking…
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="gl-tutor-input" className="sr-only">
          Ask your tutor
        </label>
        <input
          id="gl-tutor-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendFree();
          }}
          placeholder={socratic ? "Respond to your tutor…" : "Ask anything about your topic…"}
          disabled={!canSend}
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none ring-accent/20 focus:ring-2 disabled:opacity-50"
        />
        <div className="flex gap-2">
          <Button type="button" disabled={!canSend || !input.trim()} onClick={sendFree} className="min-h-11 flex-1 sm:flex-none">
            Send
          </Button>
          {messages.length > 0 && (
            <Button type="button" variant="secondary" onClick={reset} className="min-h-11">
              New chat
            </Button>
          )}
        </div>
      </div>

      {insufficientCredits && <CreditPromptLinks creditCost={1} className="text-xs text-amber-700" />}
      {!sessionToken && (
        <p className="text-xs text-muted" role="note">Sign in to chat with your adaptive tutor.</p>
      )}
    </div>
  );
});
