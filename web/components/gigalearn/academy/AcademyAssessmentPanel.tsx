"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { api } from "convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function AssessmentInner() {
  const params = useSearchParams();
  const courseSlug = (params.get("course") || "").trim().toLowerCase();
  const assessmentId = (params.get("assessment") || "").trim();
  const sessionToken = getSessionToken();

  const list = useQuery(
    api.gigaLearnAcademyAssessments.listCourseAssessments,
    sessionToken && courseSlug ? { sessionToken, courseSlug } : "skip"
  );
  const view = useQuery(
    api.gigaLearnAcademyAssessments.getAssessmentAttemptView,
    sessionToken && courseSlug && assessmentId
      ? { sessionToken, courseSlug, assessmentId }
      : "skip"
  );
  const history = useQuery(
    api.gigaLearnAcademyAssessments.listMyAssessmentHistory,
    sessionToken && courseSlug ? { sessionToken, courseSlug } : "skip"
  );
  const progression = useQuery(
    api.gigaLearnAcademyAssessments.getCourseProgression,
    sessionToken && courseSlug ? { sessionToken, courseSlug } : "skip"
  );

  const submit = useMutation(api.gigaLearnAcademyAssessments.submitAssessmentAttempt);
  const aiAssist = useAction(api.gigaLearnAcademyAssessments.runAiAssistedAssessmentFeedback);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number | null;
    passed: boolean;
    feedbackSummary?: string | null;
    revisionHint?: string | null;
    status: string;
    results?: Array<{
      questionId: string;
      correct: boolean;
      explanation?: string;
    }>;
    protectedFinal?: boolean;
  } | null>(null);

  const selectedMeta = useMemo(
    () => list?.assessments.find((a: { id: string }) => a.id === assessmentId) ?? null,
    [list, assessmentId]
  );

  if (!sessionToken && !hasPersistedAuth()) {
    return (
      <AcademyChrome active="practice" title="Academy assessments">
        <ProductSignInPrompt
          productName="GigaLearn Academy"
          description="Sign in and enrol to take server-graded Academy assessments."
          nextPath={`/gigalearn/academy/assess/?course=${encodeURIComponent(courseSlug)}`}
        />
      </AcademyChrome>
    );
  }

  if (!courseSlug) {
    return (
      <AcademyChrome active="practice" title="Academy assessments">
        <p className="text-sm text-muted">Choose a course from the catalogue first.</p>
        <ButtonLink href="/gigalearn/academy/courses/" className="mt-4 min-h-11">
          Course catalogue
        </ButtonLink>
      </AcademyChrome>
    );
  }

  async function onSubmit() {
    if (!sessionToken || !assessmentId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await submit({
        sessionToken,
        courseSlug,
        assessmentId,
        answersJson: JSON.stringify(answers),
        idempotencyKey: newIdempotencyKey(),
      });
      setResult({
        score: response.score,
        passed: Boolean(response.passed),
        feedbackSummary: response.feedbackSummary,
        revisionHint: response.revisionHint,
        status: response.status,
        results: response.results,
        protectedFinal: response.protectedFinal,
      });
      if (response.needsAiAssist && response.attemptId) {
        try {
          const ai = await aiAssist({
            sessionToken,
            courseSlug,
            assessmentId,
            attemptId: response.attemptId,
          });
          setResult({
            score: ai.score,
            passed: ai.passed,
            feedbackSummary: ai.feedbackSummary,
            revisionHint: ai.revisionHint,
            status: ai.status,
            protectedFinal: ai.protectedFinal,
            results: response.results,
          });
        } catch (e) {
          setError(
            e instanceof Error
              ? `Objective score saved; AI feedback failed: ${e.message}`
              : "AI feedback failed."
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AcademyChrome
      active="practice"
      title="Course assessments"
      subtitle="Server-authoritative grading. Tutoring alone never completes an assessment. No certificates in this phase."
    >
      <div className="flex flex-wrap gap-2 text-sm">
        <ButtonLink
          href={`/gigalearn/academy/course/?slug=${encodeURIComponent(courseSlug)}`}
          variant="outline"
          className="min-h-11"
        >
          Course details
        </ButtonLink>
        <ButtonLink href="/gigalearn/?tab=tutor" variant="outline" className="min-h-11">
          AI Tutor
        </ButtonLink>
      </div>

      {progression ? (
        <p className="text-xs text-muted">
          Unlocked modules:{" "}
          {progression.unlockedModuleIds.length
            ? progression.unlockedModuleIds.join(", ")
            : "(none gated yet)"}
          {progression.passedAssessmentIds.length
            ? ` · Passed: ${progression.passedAssessmentIds.join(", ")}`
            : ""}
        </p>
      ) : null}

      {list === undefined ? (
        <ClientAppHydrationNotice productName="GigaLearn Academy" />
      ) : (
        <section className="saas-card space-y-3 rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Available assessments</h2>
          <ul className="space-y-2">
            {list.assessments.map(
              (a: {
                id: string;
                title: string;
                kind: string;
                passThreshold: number;
                gradingMode: string;
                protectedFinal: boolean;
                unlocked: boolean;
                passed: boolean;
                attemptsRemaining: number;
              }) => (
              <li key={a.id}>
                <Link
                  href={`/gigalearn/academy/assess/?course=${encodeURIComponent(courseSlug)}&assessment=${encodeURIComponent(a.id)}`}
                  className="flex flex-col gap-1 rounded-xl border border-border px-3 py-3 hover:border-accent/35 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.title}</p>
                    <p className="text-xs text-muted">
                      {a.kind} · pass {a.passThreshold}% · {a.gradingMode}
                      {a.protectedFinal ? " · protected" : ""}
                      {!a.unlocked ? " · locked" : ""}
                      {a.passed ? " · passed" : ""}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-accent">
                    {a.attemptsRemaining} attempts left
                  </span>
                </Link>
              </li>
            )
            )}
          </ul>
        </section>
      )}

      {assessmentId && view === undefined ? (
        <ClientAppHydrationNotice productName="GigaLearn Academy" />
      ) : null}

      {view ? (
        <section className="saas-card space-y-4 rounded-2xl border border-border p-4 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{view.title}</h2>
            <p className="mt-1 text-sm text-muted">{view.description}</p>
            <p className="mt-2 text-xs text-muted">
              Pass mark {view.passThreshold}% · {view.attemptsRemaining} / {view.maxAttempts}{" "}
              attempts remaining · {view.gradingMode}
            </p>
          </div>

          {!view.unlocked ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Locked until required earlier assessments are passed.
            </p>
          ) : view.attemptsRemaining <= 0 && !result ? (
            <p className="text-sm text-muted">No attempts remaining.</p>
          ) : (
            <div className="space-y-4">
              {view.questions.map(
                (
                  q: {
                    id: string;
                    stem: string;
                    type: string;
                    options?: string[];
                  },
                  idx: number
                ) => (
                <fieldset key={q.id} className="rounded-xl border border-border p-3">
                  <legend className="px-1 text-sm font-medium text-foreground">
                    {idx + 1}. {q.stem}
                  </legend>
                  {q.options?.length ? (
                    <div className="mt-2 space-y-2">
                      {q.options.map((opt: string) => (
                        <label key={opt} className="flex min-h-11 items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : q.type === "true_false" ? (
                    <div className="mt-2 flex gap-3">
                      {["true", "false"].map((opt) => (
                        <label key={opt} className="flex min-h-11 items-center gap-2 text-sm capitalize">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-xl border border-border px-3 py-2 text-sm"
                      value={answers[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="Your answer"
                    />
                  )}
                </fieldset>
              )
              )}
              <Button
                type="button"
                className="min-h-11"
                disabled={busy || !view.unlocked}
                onClick={() => void onSubmit()}
              >
                {busy ? "Submitting…" : "Submit for grading"}
              </Button>
              <p className="text-xs text-muted">
                Scores are calculated on the server. Client-supplied scores are ignored.
                {selectedMeta?.protectedFinal
                  ? " Protected assessment: answer keys stay hidden."
                  : ""}
              </p>
            </div>
          )}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-3 text-sm">
              <p className="font-semibold text-foreground">
                Status: {result.status}
                {result.score != null ? ` · Score ${result.score}%` : ""}
                {result.passed ? " · Passed" : " · Not passed"}
              </p>
              {result.feedbackSummary ? (
                <p className="mt-2 whitespace-pre-wrap text-muted">{result.feedbackSummary}</p>
              ) : null}
              {result.revisionHint ? (
                <p className="mt-2 text-muted">Revision: {result.revisionHint}</p>
              ) : null}
              {result.results?.length && !result.protectedFinal ? (
                <ul className="mt-3 space-y-1 text-xs text-muted">
                  {result.results.map((r) => (
                    <li key={r.questionId}>
                      {r.questionId}: {r.correct ? "correct" : "incorrect"}
                      {r.explanation ? ` — ${r.explanation}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {history && history.length > 0 ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Attempt history</h2>
          <ul className="mt-2 space-y-2 text-xs text-muted">
            {history.map(
              (h: {
                id: string;
                assessmentId: string;
                attemptNumber: number;
                status: string;
                score?: number | null;
                passed?: boolean | null;
              }) => (
              <li key={h.id} className="rounded-lg border border-border px-3 py-2">
                {h.assessmentId} · attempt {h.attemptNumber} · {h.status}
                {h.score != null ? ` · ${h.score}%` : ""}
                {h.passed ? " · passed" : ""}
              </li>
            )
            )}
          </ul>
        </section>
      ) : null}
    </AcademyChrome>
  );
}

export function AcademyAssessmentPanel() {
  return (
    <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
      <AssessmentInner />
    </Suspense>
  );
}
