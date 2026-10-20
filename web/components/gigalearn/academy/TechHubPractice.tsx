"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { ExamPracticeShareButton } from "@/components/gigalearn/exam/ExamPracticeShareButton";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { getBuiltinAcademyCourse } from "@/lib/gigalearn/academy/courseCatalog";
import {
  getTechCourseMeta,
  techPracticeHref,
} from "@/lib/gigalearn/academy/techBanks/techBankMeta";
import type { TechPracticeMode } from "@/lib/gigalearn/academy/techBanks/techBankTypes";
import { ACADEMY_SURFACE_CLASS } from "@/lib/gigalearn/academy/visualTheme";
import {
  EXAM_PRACTICE_FREE_QUESTION_COUNT,
  EXAM_PRACTICE_PREMIUM_QUESTION_COUNT,
  hasExamPracticePremiumAccess,
  isExamPracticeCourseSlug,
} from "@/lib/gigalearn/examPractice/practiceLimits";
import {
  rewardForCorrectAnswer,
  rewardForSessionScore,
} from "@/lib/gigalearn/examPractice/rewardCopy";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Check, Clock3, Play, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

const MODES: { id: TechPracticeMode; label: string; hint: string }[] = [
  { id: "learn", label: "Learn", hint: "One question · explain after submit" },
  { id: "practice_test", label: "Practice test", hint: "Score after you finish" },
  { id: "timed", label: "Timed", hint: "Server deadline · auto-submit" },
  { id: "topic", label: "Topic", hint: "Pick a topic below" },
  { id: "random", label: "Random", hint: "Shuffled approved set" },
  { id: "revision", label: "Revision", hint: "Retry previous misses" },
  { id: "challenge", label: "Challenge", hint: "Scenario-style items" },
];

function TechHubInner() {
  const params = useSearchParams();
  const courseSlug = (params.get("course") || "").trim().toLowerCase();
  const isExamCourse = isExamPracticeCourseSlug(courseSlug);
  const initialMode = (params.get("mode") || (isExamCourse ? "timed" : "learn")).trim() as TechPracticeMode;
  const urlCount = Number(params.get("count") || "");
  const sessionToken = getSessionToken();
  const course = useMemo(
    () => (courseSlug ? getBuiltinAcademyCourse(courseSlug) : undefined),
    [courseSlug]
  );
  const meta = useMemo(
    () => (courseSlug ? getTechCourseMeta(courseSlug) : undefined),
    [courseSlug]
  );

  const summary = useQuery(
    api.gigaLearnTechBanks.getTechCoursePracticeSummary,
    sessionToken && courseSlug ? { sessionToken, courseSlug } : "skip"
  );
  const chatCredits = useQuery(
    api.users.getChatCredits,
    sessionToken ? { sessionToken } : "skip"
  );
  const enrol = useMutation(api.gigaLearnAcademy.enrolInCourse);
  const startSession = useMutation(api.gigaLearnTechBanks.startTechPracticeSession);
  const saveAnswer = useMutation(api.gigaLearnTechBanks.saveTechPracticeAnswer);
  const submitSession = useMutation(api.gigaLearnTechBanks.submitTechPracticeSession);

  // Premium packs require active subscription or credit-pack purchase.
  // `isPremium` already reflects credit-pack purchase via AI tier; residual
  // balance alone must not unlock larger packs (server enforces the same).
  const premiumAccess = hasExamPracticePremiumAccess({
    subscriptionActive: chatCredits?.subscriptionActive,
    isPremium: chatCredits?.isPremium,
  });

  const countChoices = useMemo(() => {
    if (!isExamCourse) return [5, 10, 15, 20, 30];
    if (premiumAccess) {
      return [10, 20, 50, 100, 200, EXAM_PRACTICE_PREMIUM_QUESTION_COUNT];
    }
    return [10, 20, 30, EXAM_PRACTICE_FREE_QUESTION_COUNT];
  }, [isExamCourse, premiumAccess]);

  const defaultCount = useMemo(() => {
    if (Number.isFinite(urlCount) && urlCount > 0) {
      return countChoices.includes(urlCount)
        ? urlCount
        : countChoices.reduce((best, n) =>
            Math.abs(n - urlCount) < Math.abs(best - urlCount) ? n : best
          );
    }
    return isExamCourse ? EXAM_PRACTICE_FREE_QUESTION_COUNT : 10;
  }, [urlCount, countChoices, isExamCourse]);

  const [mode, setMode] = useState<TechPracticeMode>(
    MODES.some((m) => m.id === initialMode) ? initialMode : "learn"
  );
  const [topicId, setTopicId] = useState(params.get("topic") || "");
  const [count, setCount] = useState(defaultCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<Id<"gigaLearnTechSessions"> | null>(null);
  const [localQuestions, setLocalQuestions] = useState<
    Array<{
      questionId: string;
      topicLabel: string;
      questionText: string;
      options: string[];
      difficulty: string;
    }>
  >([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [reward, setReward] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [learnFeedback, setLearnFeedback] = useState<{
    correct: boolean;
    explanation: string;
    correctIndex: number | null;
    pendingReview?: boolean;
  } | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [serverSkew, setServerSkew] = useState(0);
  const [results, setResults] = useState<null | {
    score: number;
    maxScore: number;
    percent?: number;
    results: Array<{
      questionId: string;
      selectedIndex: number | null;
      correctIndex: number;
      correct: boolean;
      explanation: string;
      questionText: string;
      options: string[];
    }>;
  }>(null);

  useEffect(() => {
    setCount(defaultCount);
  }, [defaultCount]);

  const liveSession = useQuery(
    api.gigaLearnTechBanks.getTechPracticeSession,
    sessionToken && sessionId ? { sessionToken, sessionId } : "skip"
  );

  useEffect(() => {
    if (!liveSession) return;
    setServerSkew(liveSession.serverNow - Date.now());
    if (liveSession.timedOut && liveSession.status === "in_progress" && sessionToken && sessionId) {
      void submitSession({ sessionToken, sessionId })
        .then((r) => {
          setResults({
            score: r.score ?? 0,
            maxScore: r.maxScore ?? 0,
            percent: r.percent,
            results: r.results ?? [],
          });
        })
        .catch(() => undefined);
    }
  }, [liveSession, sessionId, sessionToken, submitSession]);

  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (!endsAt || results) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt, results]);

  const secondsLeft =
    endsAt != null ? Math.max(0, Math.floor((endsAt - (nowTick + serverSkew)) / 1000)) : null;

  if (!courseSlug || !course || !meta) {
    return (
      <AcademyChrome active="course" title="Technology Learning Hub">
        <p className="text-sm text-muted">Choose a Technology course from the Academy catalogue.</p>
        <ButtonLink href="/gigalearn/academy/courses/" className="mt-4 min-h-11">
          Open catalogue
        </ButtonLink>
      </AcademyChrome>
    );
  }

  if (!sessionToken && !hasPersistedAuth()) {
    return (
      <AcademyChrome active="course" title={course.title}>
        <ProductSignInPrompt
          productName="Technology Learning Hub"
          description="Sign in to enrol and practise with server-graded questions."
          nextPath={techPracticeHref(courseSlug, { mode })}
        />
      </AcademyChrome>
    );
  }

  if (summary === undefined) {
    return (
      <AcademyChrome active="course" title={course.title}>
        <ClientAppHydrationNotice productName="Technology Learning Hub" />
      </AcademyChrome>
    );
  }

  async function ensureEnrolled() {
    if (!sessionToken) throw new Error("Sign in required.");
    if (summary?.enrolled) return;
    await enrol({ sessionToken, courseSlug });
  }

  async function onStart() {
    if (!sessionToken) return;
    setBusy(true);
    setError(null);
    setResults(null);
    setLearnFeedback(null);
    try {
      await ensureEnrolled();
      const started = await startSession({
        sessionToken,
        courseSlug,
        mode,
        topicId: mode === "topic" || mode === "challenge" ? topicId || undefined : undefined,
        count,
        timeLimitMinutes: mode === "timed" ? 30 : undefined,
      });
      setSessionId(started.sessionId);
      setLocalQuestions(started.questions);
      setIndex(0);
      setAnswers({});
      setReward(null);
      setStreak(0);
      setEndsAt(started.endsAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start practice.");
    } finally {
      setBusy(false);
    }
  }

  const current = localQuestions[index];

  async function onSubmitAnswer(selectedIndex: number) {
    if (!sessionToken || !sessionId || !current) return;
    setBusy(true);
    setError(null);
    try {
      const res = await saveAnswer({
        sessionToken,
        sessionId,
        questionId: current.questionId,
        selectedIndex,
      });
      setAnswers((prev) => ({ ...prev, [current.questionId]: selectedIndex }));
      if (res.autoSubmitted) {
        setResults({
          score: res.autoSubmitted.score ?? 0,
          maxScore: res.autoSubmitted.maxScore ?? 0,
          percent: res.autoSubmitted.percent,
          results: res.autoSubmitted.results ?? [],
        });
        return;
      }
      if (res.feedback) {
        setLearnFeedback(res.feedback);
        if (res.feedback.correct) {
          const nextStreak = streak + 1;
          setStreak(nextStreak);
          setReward(
            rewardForCorrectAnswer({
              streak: nextStreak,
              seed: index + nextStreak,
            })
          );
        } else {
          setStreak(0);
          setReward(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save answer.");
    } finally {
      setBusy(false);
    }
  }

  async function onFinish() {
    if (!sessionToken || !sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitSession({ sessionToken, sessionId });
      setResults({
        score: res.score ?? 0,
        maxScore: res.maxScore ?? 0,
        percent: res.percent,
        results: res.results ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit session.");
    } finally {
      setBusy(false);
    }
  }

  if (results) {
    const sessionPraise =
      results.percent != null ? rewardForSessionScore(results.percent) : null;
    const shareKind = courseSlug.includes("bece")
      ? ("bece" as const)
      : courseSlug.includes("teacher-promotion")
        ? ("teacher_promotion" as const)
        : null;
    return (
      <AcademyChrome active="course" title={`${course.title} · Results`}>
        <article className={cn(ACADEMY_SURFACE_CLASS.catalogue, "space-y-4 p-4 sm:p-6")}>
          <h2 className="text-xl font-bold text-[#1E1B4B]">Session complete</h2>
          {sessionPraise ? (
            <p className="exam-session-reward" role="status">
              {sessionPraise}
            </p>
          ) : null}
          <p className="text-sm text-slate-600">
            Score {results.score}/{results.maxScore}
            {results.percent != null ? ` · ${results.percent}%` : ""}
          </p>
          <ul className="space-y-3">
            {results.results.map((r, i) => (
              <li key={r.questionId} className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">
                  {i + 1}. {r.questionText}
                </p>
                <p className={r.correct ? "mt-1 text-emerald-700" : "mt-1 text-rose-700"}>
                  {r.correct ? "Correct" : "Incorrect"}
                  {r.correctIndex >= 0
                    ? ` · Answer: ${r.options[r.correctIndex] ?? "—"}`
                    : " · Key under review"}
                </p>
                <p className="mt-1 text-slate-600">{r.explanation}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-11"
              onClick={() => {
                setResults(null);
                setSessionId(null);
                setLocalQuestions([]);
                setReward(null);
                setStreak(0);
              }}
            >
              Practise again
            </Button>
            {shareKind ? (
              <ExamPracticeShareButton
                kind={shareKind}
                label="Share this practice"
                className="sm:min-w-[12rem]"
              />
            ) : null}
            <ButtonLink
              href={`/gigalearn/academy/course/?slug=${encodeURIComponent(courseSlug)}`}
              variant="secondary"
              className="min-h-11"
            >
              Back to course
            </ButtonLink>
          </div>
        </article>
      </AcademyChrome>
    );
  }

  if (sessionId && current) {
    const selected = answers[current.questionId];
    const revealed = mode === "learn" && learnFeedback != null;
    const mm =
      secondsLeft != null ? String(Math.floor(secondsLeft / 60)).padStart(2, "0") : null;
    const ss = secondsLeft != null ? String(secondsLeft % 60).padStart(2, "0") : null;

    return (
      <AcademyChrome active="course" title={course.title}>
        <div
          className={cn(
            "exam-session",
            courseSlug.includes("bece") && "exam-session--bece"
          )}
        >
          <div className="exam-session-toolbar">
            <Link
              href={`/gigalearn/academy/course/?slug=${encodeURIComponent(courseSlug)}`}
              className="exam-session-close"
              aria-label="Exit practice"
            >
              <X className="h-5 w-5" />
            </Link>
            <div className="exam-session-toolbar-center">
              <p className="exam-session-toolbar-title">
                Question {index + 1} of {localQuestions.length}
              </p>
              <div
                className="exam-session-progress"
                aria-hidden
              >
                <div
                  className="exam-session-progress-fill"
                  style={{
                    width: `${Math.round(((index + 1) / localQuestions.length) * 100)}%`,
                  }}
                />
              </div>
              <p className="exam-session-toolbar-sub">
                {Object.keys(answers).length} answered
                {streak > 1 ? ` · streak ${streak}` : ""}
              </p>
            </div>
            {mm && ss ? (
              <div className="exam-session-timer" aria-live="polite">
                <span className="exam-session-timer-label">Time left</span>
                <span className="exam-session-timer-value">
                  {mm}:{ss}
                </span>
              </div>
            ) : (
              <span className="w-16" />
            )}
          </div>

          <div className="exam-session-body">
            <article className="exam-session-card exam-session-card--pad">
              <div className="exam-session-chips">
                <span className="exam-session-chip">{current.topicLabel}</span>
                <span className="exam-session-chip exam-session-chip--muted capitalize">
                  {current.difficulty}
                </span>
              </div>
              <p className="exam-session-kicker">Question {index + 1}</p>
              <h2 className="exam-session-stem">{current.questionText}</h2>
              <ul className="exam-session-options">
                {current.options.map((opt, optIndex) => {
                  const isSelected = selected === optIndex;
                  const isCorrect = revealed && learnFeedback?.correctIndex === optIndex;
                  const isWrong = revealed && isSelected && !learnFeedback?.correct;
                  return (
                    <li key={optIndex}>
                      <button
                        type="button"
                        disabled={busy || (mode === "learn" && revealed)}
                        onClick={() => {
                          if (mode === "learn") {
                            if (!revealed) void onSubmitAnswer(optIndex);
                          } else {
                            setAnswers((prev) => ({
                              ...prev,
                              [current.questionId]: optIndex,
                            }));
                            void onSubmitAnswer(optIndex);
                          }
                        }}
                        className={cn(
                          "exam-session-option",
                          isCorrect && "exam-session-option--correct",
                          isWrong && "exam-session-option--wrong",
                          !revealed && isSelected && "exam-session-option--picked"
                        )}
                      >
                        <span className="exam-session-option-letter">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <span className="exam-session-option-text">{opt}</span>
                        {isCorrect ? (
                          <Check className="exam-session-icon-ok" aria-hidden />
                        ) : null}
                        {isWrong ? <X className="exam-session-icon-bad" aria-hidden /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {revealed && reward ? (
                <p className="exam-session-reward" role="status" data-testid="exam-reward">
                  {reward}
                </p>
              ) : null}
              {revealed && learnFeedback ? (
                <div className="exam-session-explain" role="status">
                  <p>
                    <span className="exam-session-explain-label">
                      {learnFeedback.pendingReview
                        ? "Review note: "
                        : learnFeedback.correct
                          ? "Correct — "
                          : "Incorrect — "}
                    </span>
                    {learnFeedback.explanation}
                  </p>
                </div>
              ) : null}
              {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
            </article>
          </div>

          <div className="exam-session-footer">
            <button
              type="button"
              className="exam-session-btn-secondary"
              disabled={index === 0}
              onClick={() => {
                setIndex((i) => Math.max(0, i - 1));
                setLearnFeedback(null);
                setReward(null);
              }}
            >
              ← Previous
            </button>
            {index < localQuestions.length - 1 ? (
              <button
                type="button"
                className="exam-session-btn-primary"
                disabled={mode === "learn" && !revealed}
                onClick={() => {
                  setIndex((i) => i + 1);
                  setLearnFeedback(null);
                  setReward(null);
                }}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                className="exam-session-btn-primary"
                disabled={busy || (mode === "learn" && !revealed)}
                onClick={() => void onFinish()}
              >
                Finish &amp; review
              </button>
            )}
          </div>
        </div>
      </AcademyChrome>
    );
  }

  return (
    <AcademyChrome active="course" title="Technology Learning Hub">
      <div className="space-y-4">
        <section className={cn(ACADEMY_SURFACE_CLASS.catalogue, "space-y-3 p-4 sm:p-6")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            Technology · {course.subject}
          </p>
          <h2 className="text-2xl font-bold text-[#1E1B4B]">{course.title}</h2>
          <p className="text-sm text-slate-600">{course.description}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
            {course.learningObjectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-violet-50 p-3">
              <dt className="text-[11px] font-medium uppercase text-violet-800">Questions</dt>
              <dd className="text-xl font-bold text-[#1E1B4B]">{meta.approvedQuestionCount}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-[11px] font-medium uppercase text-slate-600">Topics</dt>
              <dd className="text-xl font-bold">{meta.topics.length}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-[11px] font-medium uppercase text-slate-600">Difficulty</dt>
              <dd className="text-lg font-bold capitalize">{course.difficulty}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-[11px] font-medium uppercase text-slate-600">Duration</dt>
              <dd className="text-lg font-bold">{Math.round(course.durationMinutes / 60)}h</dd>
            </div>
          </dl>
          {meta.awaitingMaterials ? (
            <p
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
              data-testid="tech-awaiting-materials"
            >
              Question bank PDF not imported yet for this course. The pathway is published so you
              can enrol; interactive practice unlocks after a validated import.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Showing {meta.approvedQuestionCount} unique approved questions after extraction and
              near-duplicate removal (source claimed 500). Not an official certification exam.
            </p>
          )}
        </section>

        {summary.enrolled ? (
          <section className={cn(ACADEMY_SURFACE_CLASS.performance, "p-4 sm:p-5")}>
            <h3 className="font-bold">Your progress</h3>
            <p className="mt-1 text-sm text-slate-600">
              Pathway {summary.progressPercent}% · Sessions completed {summary.sessionsCompleted}
              {summary.bestScorePercent != null ? ` · Best ${summary.bestScorePercent}%` : ""}
              {summary.revisionQuestionCount
                ? ` · ${summary.revisionQuestionCount} to revise`
                : ""}
            </p>
          </section>
        ) : null}

        {!meta.awaitingMaterials ? (
          <section className={cn(ACADEMY_SURFACE_CLASS.catalogue, "space-y-3 p-4 sm:p-6")}>
            <h3 className="text-lg font-bold text-[#1E1B4B]">Practice modes</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-sm",
                    mode === m.id
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-white"
                  )}
                >
                  <span className="font-semibold">{m.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">{m.hint}</span>
                </button>
              ))}
            </div>
            {(mode === "topic" || mode === "challenge") && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Topic</span>
                <select
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                >
                  <option value="">All topics / pick one</option>
                  {meta.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.questionCount})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Questions this session</span>
              <select
                className="min-h-11 w-full rounded-xl border border-slate-200 px-3"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                {countChoices.map((n) => (
                  <option key={n} value={n}>
                    {n}
                    {isExamCourse && n > EXAM_PRACTICE_FREE_QUESTION_COUNT
                      ? " (subscription / pack purchase)"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            {isExamCourse ? (
              <p className="text-xs text-slate-500">
                Free learners get up to {EXAM_PRACTICE_FREE_QUESTION_COUNT} questions. An active
                subscription or a credit-pack purchase unlocks up to{" "}
                {EXAM_PRACTICE_PREMIUM_QUESTION_COUNT} (capped by bank size). A leftover credit
                balance alone does not unlock larger packs. Correct answers earn praise like
                Excellent and Superb.
              </p>
            ) : null}
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <Button
              type="button"
              className="min-h-11 w-full"
              disabled={busy || (mode === "topic" && !topicId)}
              onClick={() => void onStart()}
            >
              <Play className="mr-2 h-4 w-4" aria-hidden />
              {summary.enrolled ? "Start practice" : "Enrol & start practice"}
            </Button>
            {mode === "timed" ? (
              <p className="flex items-start gap-2 text-xs text-slate-500">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Timed mode uses a server deadline. Changing the device clock cannot extend the
                attempt.
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink
            href={`/gigalearn/academy/course/?slug=${encodeURIComponent(courseSlug)}`}
            variant="secondary"
            className="min-h-11"
          >
            Course pathway
          </ButtonLink>
          <ButtonLink href="/gigalearn/academy/courses/" variant="secondary" className="min-h-11">
            Catalogue
          </ButtonLink>
        </div>
      </div>
    </AcademyChrome>
  );
}

export function TechHubPractice() {
  return (
    <Suspense
      fallback={
        <AcademyChrome active="course" title="Technology Learning Hub">
          <ClientAppHydrationNotice productName="Technology Learning Hub" />
        </AcademyChrome>
      }
    >
      <TechHubInner />
    </Suspense>
  );
}
