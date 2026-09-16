"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { ageBandFromLevel, ageUiConfig } from "@/lib/gigalearn/ageUi";
import { correctFeedback, incorrectFeedback } from "@/lib/gigalearn/feedback";
import {
  getPracticeMode,
  PRACTICE_MODES,
  type PracticeModeId,
} from "@/lib/gigalearn/practiceModes";
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
import {
  PracticeQuestionCard,
  type PracticeQuestionResult,
} from "./PracticeQuestionCard";

type PracticeSessionProps = {
  questions: GigaLearnQuestion[];
  level: string;
  subject: string;
  topic: string;
  toolId: string;
  curriculum?: string;
  sessionToken: string | null;
  initialMode?: PracticeModeId;
  onComplete?: (score: number) => void;
};

export function PracticeSession({
  questions,
  level,
  subject,
  topic,
  toolId,
  curriculum,
  sessionToken,
  initialMode = "quick",
  onComplete,
}: PracticeSessionProps) {
  const ageBand = ageBandFromLevel(level);
  const ui = ageUiConfig(ageBand);
  const recordAssessment = useMutation(api.gigaLearnProgress.recordAssessment);

  const [mode, setMode] = useState<PracticeModeId>(initialMode);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<PracticeQuestionResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [recorded, setRecorded] = useState(false);

  const modeConfig = getPracticeMode(mode);
  const examMode = modeConfig.delayFeedback;

  const activeQuestions = useMemo(() => {
    if (mode === "mission") return questions.slice(0, Math.min(5, questions.length));
    if (mode === "rapid-fire") return questions.slice(0, Math.min(8, questions.length));
    return questions;
  }, [questions, mode]);

  const current = activeQuestions[index];

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
      setFinished(false);
      const restored: PracticeQuestionResult[] = Object.entries(snap.results).map(
        ([questionId, correct]) => ({
          questionId,
          correct,
          selected: snap.answers[questionId] ?? "",
        })
      );
      setResults(restored);
    }
  }, [toolId, level, questions.length]);

  useEffect(() => {
    if (finished) return;
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
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }, [toolId, mode, level, subject, curriculum, questions, index, results, finished]);

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

  useEffect(() => {
    if (!finished || recorded || !sessionToken) return;
    setRecorded(true);
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
    const label =
      score >= 85 ? "Strong" : score >= 70 ? "Improving" : score >= 50 ? "Practicing" : "Keep going";

    return (
      <section className="space-y-4" aria-label="Practice results">
        <div className="rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-muted">Session complete</p>
          <p className={`mt-2 font-bold text-foreground ${ui.stemClass}`}>
            {correctCount} / {activeQuestions.length} correct
          </p>
          <p className="mt-1 text-lg font-semibold text-accent">{score}% · {label}</p>
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
          className="w-full rounded-xl border border-border py-3 text-sm font-semibold"
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
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
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

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{modeConfig.description}</span>
        {secondsLeft !== null ? (
          <span className={secondsLeft <= 5 ? "font-semibold text-rose-500" : ""}>
            ⏱ {secondsLeft}s
          </span>
        ) : null}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{
            width: `${((index + (results.some((r) => r.questionId === current?.id) ? 1 : 0)) / activeQuestions.length) * 100}%`,
          }}
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
