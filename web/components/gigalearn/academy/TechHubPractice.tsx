"use client";

import { recordExamPracticeCompletion } from "@/lib/analytics/recordExamPractice";
import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { ExamPracticeShareButton } from "@/components/gigalearn/exam/ExamPracticeShareButton";
import { PremiumPracticeNudge } from "@/components/gigalearn/exam/PremiumPracticeNudge";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { getBuiltinAcademyCourse } from "@/lib/gigalearn/academy/courseCatalog";
import { techModeShowsImmediateFeedback } from "@/lib/gigalearn/academy/techBanks/immediateFeedback";
import {
  getTechCourseMeta,
  techPracticeHref,
} from "@/lib/gigalearn/academy/techBanks/techBankMeta";
import type {
  TechPracticeMode,
  TechQuestionType,
} from "@/lib/gigalearn/academy/techBanks/techBankTypes";
import { ACADEMY_SURFACE_CLASS } from "@/lib/gigalearn/academy/visualTheme";
import {
  EXAM_PRACTICE_FREE_QUESTION_COUNT,
  EXAM_PRACTICE_PREMIUM_QUESTION_COUNT,
  hasExamPracticePremiumAccess,
  isExamPracticeCourseSlug,
} from "@/lib/gigalearn/examPractice/practiceLimits";
import {
  rewardForCorrectAnswer,
  rewardForIncorrectAnswer,
  rewardForSessionScore,
} from "@/lib/gigalearn/examPractice/rewardCopy";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Check, Clock3, Play, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

type LearnFeedback = {
  correct: boolean;
  explanation: string;
  correctIndex: number | null;
  pendingReview?: boolean;
  selfAssessment?: boolean;
  /** Matched provisional key — never drives verified praise rewards. */
  provisionalMatch?: boolean;
  optionExplanations?: string[];
};

const MODES: { id: TechPracticeMode; label: string; hint: string }[] = [
  { id: "learn", label: "Learn", hint: "One question · explain after submit" },
  {
    id: "practice_test",
    label: "Practice test",
    hint: "Feedback after each answer · score summary at finish",
  },
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
  const initialMode = (params.get("mode") || (isExamCourse ? "practice_test" : "learn")).trim() as TechPracticeMode;
  const urlCount = Number(params.get("count") || "");
  const urlQType = (params.get("qtype") || "").trim().toLowerCase();
  const initialQuestionType: TechQuestionType | "" =
    urlQType === "true_false" || urlQType === "mcq" || urlQType === "structured" ? urlQType : "";
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

  // Premium packs: any active paid plan (Basic GHS 60+) or credit-pack purchase.
  // `subscriptionActive` covers basic/pro/premium; `isPremium` / purchase history
  // cover pack buyers. Residual balance alone must not unlock (server same).
  const premiumAccess = hasExamPracticePremiumAccess({
    subscriptionActive: chatCredits?.subscriptionActive,
    isPremium: chatCredits?.isPremium,
    hasPurchasedCredits: chatCredits?.hasPurchasedCredits,
    examPracticePremiumExpiresAt: chatCredits?.examPracticePremiumExpiresAt,
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
  const [questionType, setQuestionType] = useState<TechQuestionType | "">(
    initialQuestionType
  );
  const [count, setCount] = useState(defaultCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<Id<"gigaLearnTechSessions"> | null>(null);
  const [localQuestions, setLocalQuestions] = useState<
    Array<{
      questionId: string;
      topicLabel: string;
      curriculumStrand?: string;
      curriculumSubStrand?: string;
      questionText: string;
      options: string[];
      difficulty: string;
      questionType?: TechQuestionType;
      maxMarks?: number;
    }>
  >([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [reward, setReward] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [learnFeedback, setLearnFeedback] = useState<LearnFeedback | null>(null);
  /** Persist feedback per question so Previous/Next does not lose notes. */
  const [feedbackByQuestion, setFeedbackByQuestion] = useState<
    Record<string, LearnFeedback>
  >({});
  /** Client praise once per questionId (server scoring remains finalize-once). */
  const rewardedQuestionIdsRef = useRef<Set<string>>(new Set());
  const immediateFeedback = techModeShowsImmediateFeedback(mode);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [serverSkew, setServerSkew] = useState(0);
  const [showIncorrectOnly, setShowIncorrectOnly] = useState(false);
  const [results, setResults] = useState<null | {
    score: number;
    maxScore: number;
    percent?: number;
    rewardXp?: number;
    rewardLabel?: string | null;
    totalXp?: number;
    sessionsCompleted?: number;
    journey?: {
      passed: boolean;
      nextStage: number;
      completedQuestions: number;
      totalQuestionLimit: number;
      passPercent: number;
    } | null;
    results: Array<{
      questionId: string;
      selectedIndex: number | null;
      correctIndex: number;
      correct: boolean;
      explanation: string;
      questionText: string;
      options: string[];
      writtenAnswer?: string | null;
      markingGuide?: string[];
      maxMarks?: number;
      requiresSelfAssessment?: boolean;
      optionExplanations?: string[];
      provisional?: boolean;
      provisionalMatch?: boolean;
      scored?: boolean;
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
            rewardXp: r.rewardXp,
            rewardLabel: r.rewardLabel,
            totalXp: r.totalXp,
            sessionsCompleted: r.sessionsCompleted,
            journey: r.journey,
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

  useEffect(() => {
    if (isExamCourse && results?.results.some((row) => row.selectedIndex != null)) {
      recordExamPracticeCompletion();
    }
  }, [isExamCourse, results]);

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
        // BECE subject links carry topicId even in Practice / Timed modes. Keep
        // that subject constraint so a Maths session cannot draw RME questions.
        topicId: isExamCourse && topicId ? topicId : mode === "topic" || mode === "challenge" ? topicId || undefined : undefined,
        count,
        timeLimitMinutes: mode === "timed" ? 30 : undefined,
        questionType: questionType || undefined,
      });
      setSessionId(started.sessionId);
      setLocalQuestions(
        started.questions.map(
          (q: {
            questionId: string;
            topicLabel: string;
            curriculumStrand?: string;
            curriculumSubStrand?: string;
            questionText: string;
            options: string[];
            difficulty: string;
            questionType?: TechQuestionType;
            maxMarks?: number;
          }) => ({
            ...q,
            questionType: q.questionType === "true_false" ? "true_false" : q.questionType === "structured" ? "structured" : "mcq",
          })
        )
      );
      setIndex(0);
      setAnswers({});
      setTextAnswers({});
      setFeedbackByQuestion({});
      setLearnFeedback(null);
      setReward(null);
      setStreak(0);
      rewardedQuestionIdsRef.current = new Set();
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
    // Immediate-feedback modes: one reveal + one praise pulse per question.
    if (immediateFeedback && feedbackByQuestion[current.questionId] != null) return;
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
          rewardXp: res.autoSubmitted.rewardXp,
          rewardLabel: res.autoSubmitted.rewardLabel,
          totalXp: res.autoSubmitted.totalXp,
          sessionsCompleted: res.autoSubmitted.sessionsCompleted,
          results: res.autoSubmitted.results ?? [],
        });
        return;
      }
      if (res.feedback) {
        const fb = res.feedback as LearnFeedback;
        setLearnFeedback(fb);
        setFeedbackByQuestion((prev) => ({ ...prev, [current.questionId]: fb }));
        const alreadyRewarded = rewardedQuestionIdsRef.current.has(current.questionId);
        if (!alreadyRewarded) {
          rewardedQuestionIdsRef.current.add(current.questionId);
          // Unverified / provisional keys never grant correctness-dependent praise.
          if (fb.pendingReview) {
            // Encourage continued practice without claiming correctness or extending a verified streak.
            setStreak(0);
            setReward(null);
          } else if (fb.correct) {
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
            setReward(rewardForIncorrectAnswer({ seed: index }));
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save answer.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitTextAnswer() {
    if (!sessionToken || !sessionId || !current || current.questionType !== "structured") return;
    const response = (textAnswers[current.questionId] ?? "").trim();
    if (response.length < 2) {
      setError("Write your response before saving it.");
      return;
    }
    if (response.length > 5000) {
      setError("Your response must be 5,000 characters or fewer.");
      return;
    }
    if (immediateFeedback && feedbackByQuestion[current.questionId] != null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await saveAnswer({
        sessionToken,
        sessionId,
        questionId: current.questionId,
        textAnswer: response,
      });
      setFeedbackByQuestion((prev) => ({
        ...prev,
        [current.questionId]: (res.feedback as LearnFeedback) ?? {
          correct: false,
          pendingReview: true,
          explanation: "Written response saved; it is not automatically scored.",
          correctIndex: null,
        },
      }));
      setLearnFeedback((res.feedback as LearnFeedback) ?? null);
      setAnswers((prev) => ({ ...prev, [current.questionId]: -1 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save written response.");
    } finally {
      setBusy(false);
    }
  }

  function goToQuestion(nextIndex: number) {
    const q = localQuestions[nextIndex];
    setIndex(nextIndex);
    setReward(null);
    setLearnFeedback(q ? feedbackByQuestion[q.questionId] ?? null : null);
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
        rewardXp: res.rewardXp,
        rewardLabel: res.rewardLabel,
        totalXp: res.totalXp,
        sessionsCompleted: res.sessionsCompleted,
        journey: res.journey,
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
      results.rewardLabel ||
      (results.percent != null ? rewardForSessionScore(results.percent) : null);
    const shareKind = courseSlug.includes("bece")
      ? ("bece" as const)
      : courseSlug.includes("teacher-promotion") ||
          courseSlug.startsWith("exam-ad") ||
          courseSlug.includes("director")
        ? ("teacher_promotion" as const)
        : null;
    const incorrect = results.results.filter((r) => !r.correct && !r.provisional && !r.requiresSelfAssessment);
    const reviewRows = showIncorrectOnly ? incorrect : results.results;
    return (
      <AcademyChrome active="course" title={`${course.title} · Results`}>
        <article
          className={cn(ACADEMY_SURFACE_CLASS.catalogue, "space-y-4 p-4 sm:p-6")}
          data-testid="tech-practice-results"
        >
          <h2 className="text-xl font-bold text-[#1E1B4B]">Session complete</h2>
          {sessionPraise ? (
            <p className="exam-session-reward" role="status" data-testid="session-reward-label">
              {sessionPraise}
            </p>
          ) : null}
          <p className="text-sm text-slate-600">
            Written-response items are excluded from the automatic score; use their marking points for self-assessment. They have not been teacher graded.
          </p>
          <p className="text-sm text-slate-600">
            {results.maxScore > 0
              ? `Verified score ${results.score}/${results.maxScore}${
                  results.percent != null ? ` · ${results.percent}%` : ""
                }`
              : "No verified answer keys in this session — provisional items were not scored."}
          </p>
          {results.journey ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950" role="status">
              {results.journey.passed
                ? `Stage passed! You have completed ${results.journey.completedQuestions} of up to ${results.journey.totalQuestionLimit} available questions. Stage ${results.journey.nextStage} is now unlocked.`
                : `You need at least ${results.journey.passPercent}% to unlock the next 50 questions. Retry this same stage to improve your score.`}
            </p>
          ) : null}
          <div className="grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-950 sm:grid-cols-2">
            <p>
              Questions attempted: <strong>{results.results.length}</strong>
            </p>
            <p>
              Correct answers: <strong>{results.score}</strong>
              {results.percent != null ? ` · ${results.percent}%` : ""}
            </p>
            <p data-testid="session-reward-xp">
              Reward earned:{" "}
              <strong>{results.rewardXp != null ? `${results.rewardXp} practice XP` : "—"}</strong>
              <span className="block text-xs font-normal text-emerald-800">
                Non-monetary learning XP (not wallet credits). Provisional items do not earn XP.
              </span>
            </p>
            <p>
              Rank practice progress:{" "}
              <strong>
                {results.sessionsCompleted != null
                  ? `${results.sessionsCompleted} session${results.sessionsCompleted === 1 ? "" : "s"}`
                  : "saved"}
                {results.totalXp != null ? ` · ${results.totalXp} XP total` : ""}
              </strong>
            </p>
          </div>
          <ul className="space-y-3">
            {reviewRows.map((r, i) => (
              <li key={r.questionId} className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">
                  {i + 1}. {r.questionText}
                </p>
                <p
                  className={
                    r.requiresSelfAssessment
                      ? "mt-1 text-blue-800"
                      : r.provisional
                      ? "mt-1 text-amber-800"
                      : r.correct
                        ? "mt-1 text-emerald-700"
                        : "mt-1 text-rose-700"
                  }
                >
                  {r.requiresSelfAssessment
                    ? "Written response · self-assessment required"
                    : r.provisional
                    ? r.provisionalMatch
                      ? "Matched the practice answer · unscored"
                      : "Different from the practice answer · unscored"
                    : r.correct
                      ? "Correct"
                      : "Incorrect"}
                  {!r.provisional && r.correctIndex >= 0
                    ? ` · Answer: ${r.options[r.correctIndex] ?? "—"}`
                    : r.provisional && r.correctIndex >= 0
                      ? ` · Practice answer: ${r.options[r.correctIndex] ?? "—"}`
                      : ""}
                </p>
                <p className="mt-1 text-slate-600">{r.provisional ? r.explanation.replace(/^Answer under review\. Provisional key \(not human-verified\)\.\s*/, "") : r.explanation}</p>
                {r.writtenAnswer != null ? <div className="mt-2 rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Your written response</p><p className="mt-1 whitespace-pre-wrap">{r.writtenAnswer || "No response saved."}</p></div> : null}
                {r.markingGuide?.length ? <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-semibold uppercase text-blue-900">Self-assessment marking points · up to {r.maxMarks ?? 0} marks</p><ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">{r.markingGuide.map((point, pi) => <li key={pi}>{point}</li>)}</ul></div> : null}
                {r.optionExplanations && r.optionExplanations.length === r.options.length ? (
                  <ul className="exam-session-option-notes mt-2 space-y-1.5">
                    {r.options.map((opt, oi) => {
                      const note = r.optionExplanations?.[oi] ?? "";
                      const isKey = oi === r.correctIndex;
                      return (
                        <li
                          key={`${r.questionId}-rev-${oi}`}
                          className={cn(
                            "rounded-lg border px-2.5 py-2 text-xs leading-snug",
                            isKey
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          )}
                        >
                          <span className="font-semibold">
                            {String.fromCharCode(65 + oi)}. {opt}
                          </span>
                          <span className="mt-0.5 block font-normal">{note}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={incorrect.length === 0}
              onClick={() => setShowIncorrectOnly((v) => !v)}
              data-testid="review-incorrect"
            >
              {showIncorrectOnly
                ? "Show all answers"
                : `Review incorrect (${incorrect.length})`}
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => {
                setResults(null);
                setSessionId(null);
                setLocalQuestions([]);
                setReward(null);
                setStreak(0);
                setShowIncorrectOnly(false);
                setFeedbackByQuestion({});
                rewardedQuestionIdsRef.current = new Set();
              }}
            >
              Continue practising
            </Button>
            {courseSlug.startsWith("exam-ad") ||
            courseSlug.includes("director") ||
            courseSlug.includes("teacher-promotion") ? (
              <ButtonLink
                href="/gigalearn/exam/promotion/"
                variant="secondary"
                className="min-h-11"
              >
                Choose another rank
              </ButtonLink>
            ) : null}
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
    const currentTextAnswer = textAnswers[current.questionId] ?? "";
    const activeFeedback = learnFeedback ?? feedbackByQuestion[current.questionId] ?? null;
    const revealed = immediateFeedback && activeFeedback != null;
    const isTrueFalse =
      current.questionType === "true_false" ||
      (current.options.length === 2 &&
        current.options[0]?.toLowerCase() === "true" &&
        current.options[1]?.toLowerCase() === "false");
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
                  {isTrueFalse ? "True / False" : current.difficulty}
                </span>
              </div>
              <p className="exam-session-kicker">
                {isTrueFalse ? "Statement" : "Question"} {index + 1}
              </p>
              {current.curriculumStrand && (
                <p className="mt-2 text-sm text-muted">
                  {current.curriculumStrand}
                  {current.curriculumSubStrand && " · " + current.curriculumSubStrand}
                </p>
              )}
              <h2 className="exam-session-stem">{current.questionText}</h2>
              {current.questionType === "structured" ? (
                <div className="space-y-3">
                  <label htmlFor="structured-response" className="block text-sm font-semibold text-slate-800">
                    Your written response {current.maxMarks ? `(up to ${current.maxMarks} marks)` : ""}
                  </label>
                  <textarea
                    id="structured-response"
                    value={currentTextAnswer}
                    onChange={(event) => setTextAnswers((prev) => ({ ...prev, [current.questionId]: event.target.value }))}
                    maxLength={5000}
                    rows={8}
                    disabled={busy || revealed}
                    placeholder="Write your answer here. Explain your points clearly and use examples where needed."
                    className="min-h-40 w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200 disabled:bg-slate-50"
                    data-testid="structured-response-input"
                  />
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>Written answers are saved securely with your practice session.</span>
                    <span>{currentTextAnswer.length}/5000</span>
                  </div>
                  <button type="button" onClick={() => void onSubmitTextAnswer()} disabled={busy || revealed || currentTextAnswer.trim().length < 2} className="min-h-11 rounded-xl bg-violet-700 px-5 py-2 font-semibold text-white disabled:opacity-50" data-testid="save-structured-response">
                    {busy ? "Saving…" : revealed ? "Response saved" : "Save written response"}
                  </button>
                </div>
              ) : (
              <ul
                className={cn(
                  "exam-session-options",
                  isTrueFalse && "exam-session-options--true-false"
                )}
                role="list"
              >
                {current.options.map((opt, optIndex) => {
                  const isSelected = selected === optIndex;
                  const pending = Boolean(activeFeedback?.pendingReview);
                  const isVerifiedCorrect =
                    revealed &&
                    !pending &&
                    activeFeedback?.correct &&
                    activeFeedback.correctIndex === optIndex;
                  const isVerifiedWrong =
                    revealed &&
                    !pending &&
                    isSelected &&
                    !activeFeedback?.correct;
                  const isProvisionalKey =
                    revealed &&
                    pending &&
                    activeFeedback?.correctIndex === optIndex;
                  const label = isTrueFalse ? opt.toUpperCase() : opt;
                  return (
                    <li key={optIndex}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        disabled={busy || (immediateFeedback && revealed)}
                        onClick={() => {
                          if (immediateFeedback) {
                            if (!revealed) void onSubmitAnswer(optIndex);
                          } else {
                            if (selected === optIndex) return;
                            setAnswers((prev) => ({
                              ...prev,
                              [current.questionId]: optIndex,
                            }));
                            void onSubmitAnswer(optIndex);
                          }
                        }}
                        className={cn(
                          isTrueFalse ? "exam-session-tf" : "exam-session-option",
                          isVerifiedCorrect &&
                            (isTrueFalse
                              ? "exam-session-tf--correct"
                              : "exam-session-option--correct"),
                          isVerifiedWrong &&
                            (isTrueFalse
                              ? "exam-session-tf--wrong"
                              : "exam-session-option--wrong"),
                          isProvisionalKey && "exam-session-option--provisional",
                          !revealed &&
                            isSelected &&
                            (isTrueFalse
                              ? "exam-session-tf--picked"
                              : "exam-session-option--picked")
                        )}
                      >
                        {isTrueFalse ? (
                          <span className="exam-session-tf-label">{label}</span>
                        ) : (
                          <>
                            <span className="exam-session-option-letter">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <span className="exam-session-option-text">{opt}</span>
                          </>
                        )}
                        {isVerifiedCorrect ? (
                          <Check className="exam-session-icon-ok" aria-hidden />
                        ) : null}
                        {isVerifiedWrong ? (
                          <X className="exam-session-icon-bad" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              )}
              {revealed && reward && !activeFeedback?.pendingReview ? (
                <p className="exam-session-reward" role="status" data-testid="exam-reward">
                  {reward}
                </p>
              ) : null}
              {revealed && activeFeedback ? (
                <div className="exam-session-explain" role="status">
                  <p>
                    <span className="exam-session-explain-label">
                      {activeFeedback.selfAssessment
                        ? "Response saved — "
                        : activeFeedback.pendingReview
                        ? "Practice answer — "
                        : activeFeedback.correct
                          ? "Correct — "
                          : "Incorrect — "}
                    </span>
                    {activeFeedback.pendingReview && activeFeedback.correctIndex != null
                      ? current.options[activeFeedback.correctIndex].replace(/[.!?]$/, "") + ". "
                      : null}
                    {activeFeedback.explanation}
                    {activeFeedback.pendingReview && (
                      <small className="mt-2 block">
                        {activeFeedback.correctIndex != null && (activeFeedback.provisionalMatch
                          ? "Your choice matches the practice answer. "
                          : "Your choice differs from the practice answer. ")}
                        This question is unscored while its answer key is under review.
                      </small>
                    )}
                  </p>
                  {activeFeedback.optionExplanations &&
                  activeFeedback.optionExplanations.length === current.options.length ? (
                    <ul className="exam-session-option-notes mt-3 space-y-2">
                      {current.options.map((opt, oi) => {
                        const note = activeFeedback.optionExplanations?.[oi] ?? "";
                        const isKey = activeFeedback.correctIndex === oi;
                        const pending = Boolean(activeFeedback.pendingReview);
                        return (
                          <li
                            key={`${current.questionId}-note-${oi}`}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm leading-snug",
                              isKey && pending
                                ? "border-amber-200 bg-amber-50 text-amber-950"
                                : isKey
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                            )}
                            data-testid={
                              isKey
                                ? pending
                                  ? "exam-option-note-provisional"
                                  : "exam-option-note-correct"
                                : "exam-option-note"
                            }
                          >
                            <span className="font-semibold">
                              {isTrueFalse
                                ? opt.toUpperCase()
                                : `${String.fromCharCode(65 + oi)}. ${opt}`}
                            </span>
                            <span className="mt-0.5 block font-normal">{note}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
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
              onClick={() => goToQuestion(Math.max(0, index - 1))}
            >
              ← Previous
            </button>
            {index < localQuestions.length - 1 ? (
              <button
                type="button"
                className="exam-session-btn-primary"
                disabled={immediateFeedback && !revealed}
                onClick={() =>
                  goToQuestion(Math.min(localQuestions.length - 1, index + 1))
                }
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                className="exam-session-btn-primary"
                disabled={busy || (immediateFeedback && !revealed)}
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
          <section className={cn(ACADEMY_SURFACE_CLASS.catalogue, "space-y-4 rounded-2xl p-4 sm:p-6")} data-testid="tech-practice-setup">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Ready when you are</p>
              <h3 className="mt-1 text-xl font-extrabold text-[#1E1B4B]">Start your practice test</h3>
              <p className="mt-1 text-sm text-slate-600">Choose how you want to practise, set your question count, then start.</p>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-slate-800">Practice mode</legend>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "practice_test" as const, label: "Practice", hint: "Feedback" },
                  { id: "timed" as const, label: "Timed", hint: "Exam feel" },
                  { id: "revision" as const, label: "Revision", hint: "Retry misses" },
                ]).map((m) => (
                  <button key={m.id} type="button" onClick={() => setMode(m.id)} aria-pressed={mode === m.id}
                    className={cn("min-h-[76px] rounded-xl border px-2 py-3 text-center transition",
                      mode === m.id ? "border-violet-600 bg-violet-50 text-violet-950 ring-1 ring-violet-500" : "border-slate-200 bg-white text-slate-700 hover:border-violet-300")}>
                    <span className="block text-sm font-bold">{m.label}</span>
                    <span className="mt-1 block text-[11px] text-slate-500">{m.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <summary className="cursor-pointer py-1 text-sm font-semibold text-slate-700">More practice options</summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {MODES.filter((m) => ["learn", "topic", "random", "challenge"].includes(m.id)).map((m) => (
                  <button key={m.id} type="button" onClick={() => setMode(m.id)} aria-pressed={mode === m.id}
                    className={cn("rounded-lg border px-3 py-2 text-left text-sm",
                      mode === m.id ? "border-violet-500 bg-violet-50 font-semibold text-violet-950" : "border-slate-200 bg-white text-slate-700")}>
                    <span className="block font-semibold">{m.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{m.hint}</span>
                  </button>
                ))}
              </div>
            </details>
            {(mode === "topic" || mode === "challenge") && (
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Choose a topic</span>
                <select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                  <option value="">All topics / pick one</option>
                  {meta.topics.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.questionCount})</option>)}
                </select>
              </label>
            )}
            {isExamCourse ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-slate-800">Question type</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {([
                    { id: "" as const, label: "Mixed (recommended)" },
                    { id: "mcq" as const, label: "Multiple choice" },
                    { id: "true_false" as const, label: "True / False" },
                    { id: "structured" as const, label: "Structured response" },
                  ]).map((opt) => (
                    <button key={opt.id || "mixed"} type="button" onClick={() => setQuestionType(opt.id)} aria-pressed={questionType === opt.id}
                      className={cn("min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold",
                        questionType === opt.id ? "border-teal-600 bg-teal-50 text-teal-950" : "border-slate-200 bg-white text-slate-800")}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs leading-5 text-slate-500">Only question formats with published items in this bank can be selected.</p>
              </fieldset>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-800">Number of questions</span>
              <select className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {countChoices.map((n) => <option key={n} value={n}>{n}{isExamCourse && n > EXAM_PRACTICE_FREE_QUESTION_COUNT ? " (Basic GHS 60+ / pack)" : n === EXAM_PRACTICE_FREE_QUESTION_COUNT ? " (Free)" : ""}</option>)}
              </select>
            </label>
            {isExamCourse ? (
              <p className="rounded-xl bg-violet-50 px-3 py-3 text-xs leading-5 text-slate-700">
                Free practice includes up to {EXAM_PRACTICE_FREE_QUESTION_COUNT} questions. Premium access unlocks up to {EXAM_PRACTICE_PREMIUM_QUESTION_COUNT}, depending on bank size.
              </p>
            ) : null}
            {isExamCourse && !premiumAccess ? <PremiumPracticeNudge variant="locked" /> : null}
            {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
            <Button type="button" className="min-h-14 w-full rounded-xl text-base font-bold shadow-md" disabled={busy || (mode === "topic" && !topicId)} onClick={() => void onStart()}>
              <Play className="mr-2 h-5 w-5" aria-hidden />
              {busy ? "Preparing your test…" : summary.enrolled ? "Start Practice Test" : "Enrol & Start Practice Test"}
            </Button>
            {mode === "timed" ? <p className="flex items-start gap-2 text-xs text-slate-500"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />Timed mode uses a server deadline. Changing the device clock cannot extend the attempt.</p> : null}
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
    <ConvexAppShell>
      <Suspense
        fallback={
          <AcademyChrome active="course" title="Technology Learning Hub">
            <ClientAppHydrationNotice productName="Technology Learning Hub" />
          </AcademyChrome>
        }
      >
        <TechHubInner />
      </Suspense>
    </ConvexAppShell>
  );
}
