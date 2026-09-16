"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { ageBandFromLevel, ageUiConfig } from "@/lib/gigalearn/ageUi";
import { correctFeedback, incorrectFeedback } from "@/lib/gigalearn/feedback";
import {
  computeAnswerStreak,
  getPersonalBest,
  masteryLabel,
  sessionBadges,
  updateBestAnswerStreak,
  updatePersonalBest,
} from "@/lib/gigalearn/practiceGamification";
import {
  getPracticeMode,
  PRACTICE_MODES,
  type PracticeModeId,
} from "@/lib/gigalearn/practiceModes";
import {
  revisionQuestionIds,
  selectQuestionsForWeakTopics,
  type WeakTopicHint,
} from "@/lib/gigalearn/practiceRecommendations";
import {
  computePracticeScore,
  formatCorrectAnswer,
  type GigaLearnQuestion,
} from "@/lib/gigalearn/questions";
import {
  clearPracticeSession,
  loadPracticeSession,
  savePracticeSession,
} from "@/lib/gigalearn/practiceSessionStorage";
import { recordPracticeCompletion } from "@/lib/gigalearn/workspace";
import {
  PracticeQuestionCard,
  type PracticeQuestionResult,
} from "./PracticeQuestionCard";

const MISSED_KEY = "giga3_gigalearn_missed_questions";

type PracticeSessionProps = {
  questions: GigaLearnQuestion[];
  level: string;
  subject: string;
  topic: string;
  toolId: string;
  curriculum?: string;
  sessionToken: string | null;
  initialMode?: PracticeModeId;
  weakTopicHints?: WeakTopicHint[];
  focusWeakRevision?: boolean;
  onComplete?: (score: number) => void;
};

function saveMissedIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MISSED_KEY, JSON.stringify(ids));
  } catch {
    /* quota */
  }
}

function loadMissedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function PracticeSession({
  questions,
  level,
  subject,
  topic,
  toolId,
  curriculum,
  sessionToken,
  initialMode = "quick",
  weakTopicHints = [],
  focusWeakRevision = false,
  onComplete,
}: PracticeSessionProps) {
  const ageBand = ageBandFromLevel(level);
  const ui = ageUiConfig(ageBand);
  const recordAssessment = useMutation(api.gigaLearnProgress.recordAssessment);

  const [mode, setMode] = useState<PracticeModeId>(
    focusWeakRevision ? "revision" : initialMode
  );
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<PracticeQuestionResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  const modeConfig = getPracticeMode(mode);
  const examMode = modeConfig.delayFeedback;

  const activeQuestions = useMemo(() => {
    if (mode === "revision") {
      const missed = new Set(loadMissedIds());
      const fromMissed = questions.filter((q) => missed.has(q.id));
      const fromWeak = selectQuestionsForWeakTopics(questions, weakTopicHints, 5);
      const pool = fromMissed.length ? fromMissed : fromWeak.length ? fromWeak : questions;
      return pool.slice(0, Math.min(5, pool.length));
    }
    if (mode === "mission") return questions.slice(0, Math.min(5, questions.length));
    if (mode === "rapid-fire") return questions.slice(0, Math.min(8, questions.length));
    return questions;
  }, [questions, mode, weakTopicHints]);

  const current = activeQuestions[index];
  const answerStreak = useMemo(() => computeAnswerStreak(results), [results]);

  useEffect(() => {
    const snap = loadPracticeSession();
    if (
      snap &&
      snap.toolId === toolId &&
      snap.level === level &&
      snap.questions.length === questions.length
    ) {
      setIndex(snap.index);
      setMode(snap.mode);
      setFinished(Boolean(snap.finished));
      const restored: PracticeQuestionResult[] = Object.entries(snap.results).map(
        ([questionId, correct]) => ({
          questionId,
          correct,
          selected: snap.answers[questionId] ?? "",
        })
      );
      setResults(restored);
    }
    setSessionRestored(true);
  }, [toolId, level, questions.length]);

  useEffect(() => {
    if (!sessionRestored || finished) return;
    const answers: Record<string, string> = {};
    const resultMap: Record<string, boolean> = {};
    for (const r of results) {
      answers[r.questionId] =
        typeof r.selected === "string" ? r.selected : r.selected.join("|");
      resultMap[r.questionId] = r.correct;
    }
    savePracticeSession({
      toolId,
      mode,
      level,
      subject,
      curriculum,
      questions,
      index,
      answers,
      results: resultMap,
      finished,
      streak: answerStreak,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }, [
    sessionRestored,
    toolId,
    mode,
    level,
    subject,
    curriculum,
    questions,
    index,
    results,
    finished,
    answerStreak,
  ]);

  useEffect(() => {
    if (!modeConfig.secondsPerQuestion || finished || !current) {
      setSecondsLeft(null);
      return;
    }
    setSecondsLeft(modeConfig.secondsPerQuestion);
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null || s <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [index, modeConfig.secondsPerQuestion, finished, current]);

  const handleAnswered = useCallback((result: PracticeQuestionResult) => {
    setResults((prev) => {
      const without = prev.filter((r) => r.questionId !== result.questionId);
      return [...without, result];
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (index + 1 >= activeQuestions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
  }, [index, activeQuestions.length]);

  const score = useMemo(() => computePracticeScore(results), [results]);
  const correctCount = results.filter((r) => r.correct).length;
  const prevBest = getPersonalBest(subject);
  const isNewBest = finished && (prevBest == null || score > prevBest);
  const badges = finished
    ? sessionBadges({ score, streak: answerStreak, mode, isNewBest })
    : [];

  useEffect(() => {
    if (!finished || recorded || !sessionToken) return;
    setRecorded(true);

    const missed = revisionQuestionIds(
      Object.fromEntries(results.map((r) => [r.questionId, r.correct]))
    );
    saveMissedIds(missed);
    updatePersonalBest(subject, score);
    updateBestAnswerStreak(answerStreak);
    recordPracticeCompletion({ subject, score });

    void recordAssessment({
      sessionToken,
      subject,
      curriculum,
      topicKey: topic,
      score,
      toolId,
    }).catch(() => {
      setRecorded(false);
    });
    clearPracticeSession();
    onComplete?.(score);
  }, [
    finished,
    recorded,
    sessionToken,
    recordAssessment,
    subject,
    curriculum,
    topic,
    score,
    toolId,
    onComplete,
    results,
    answerStreak,
  ]);

  if (!questions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
        No interactive questions found in this set. Generate practice content above — we look for a
        structured question block in the response.
      </div>
    );
  }

  if (finished) {
    const label = masteryLabel(score);
    const best = Math.max(getPersonalBest(subject) ?? 0, score);

    return (
      <section className="space-y-4" aria-label="Practice results">
        <div className="rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-muted">Session complete</p>
          <p className={`mt-2 font-bold text-foreground ${ui.stemClass}`}>
            {correctCount} / {activeQuestions.length} correct
          </p>
          <p className="mt-1 text-lg font-semibold text-accent">{score}% · {label}</p>
          {best > 0 && (
            <p className="mt-1 text-xs text-muted">
              Personal best for {subject.replace(/-/g, " ")}: {best}%
              {isNewBest ? " — new record!" : ""}
            </p>
          )}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${score}%` }}
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.id}
                className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-foreground"
                title={b.description}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        {examMode && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Review explanations</h3>
            {activeQuestions.map((q) => {
              const r = results.find((x) => x.questionId === q.id);
              const ok = r?.correct ?? false;
              const fb = ok ? correctFeedback(ageBand) : incorrectFeedback(ageBand);
              return (
                <div key={q.id} className="rounded-2xl border border-border bg-white p-4">
                  <p className="text-sm font-medium text-foreground">{q.stem}</p>
                  <p className="mt-2 text-sm font-semibold">{fb.title}</p>
                  {!ok && (
                    <p className="mt-1 text-sm text-muted">
                      Correct: {formatCorrectAnswer(q)}
                    </p>
                  )}
                  {q.explanation ? (
                    <p className="mt-1 text-sm text-muted">{q.explanation}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setResults([]);
            setFinished(false);
            setRecorded(false);
          }}
          className="w-full rounded-xl border border-border py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Practice again
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Interactive practice">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">Mode</span>
        {PRACTICE_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              setIndex(0);
              setResults([]);
              setFinished(false);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              mode === m.id
                ? "bg-accent text-white"
                : "border border-border text-muted"
            }`}
            aria-pressed={mode === m.id}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{modeConfig.description}</span>
        <div className="flex items-center gap-3">
          {modeConfig.showStreak && answerStreak > 0 && (
            <span className="font-medium text-accent">🔥 {answerStreak} streak</span>
          )}
          {mode === "mission" && (
            <span>Step {index + 1} of {activeQuestions.length}</span>
          )}
          {secondsLeft !== null ? (
            <span className={secondsLeft <= 5 ? "font-semibold text-rose-500" : ""}>
              ⏱ {secondsLeft}s
            </span>
          ) : null}
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{
            width: `${((index + (results.some((r) => r.questionId === current?.id) ? 1 : 0)) / activeQuestions.length) * 100}%`,
          }}
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={0}
          aria-valuemax={activeQuestions.length}
        />
      </div>

      {current ? (
        <PracticeQuestionCard
          question={current}
          ageBand={ageBand}
          index={index}
          total={activeQuestions.length}
          examMode={examMode}
          onAnswered={handleAnswered}
          onContinue={handleContinue}
        />
      ) : null}
    </section>
  );
}
