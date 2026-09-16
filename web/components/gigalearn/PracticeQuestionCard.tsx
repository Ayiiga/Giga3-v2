"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgeBand } from "@/lib/gigalearn/ageUi";
import { ageUiConfig } from "@/lib/gigalearn/ageUi";
import {
  correctFeedback,
  incorrectFeedback,
} from "@/lib/gigalearn/feedback";
import type { GigaLearnQuestion } from "@/lib/gigalearn/questions";
import { formatCorrectAnswer, gradeAnswer } from "@/lib/gigalearn/questions";

export type PracticeQuestionResult = {
  questionId: string;
  correct: boolean;
  selected: string | string[];
};

type PracticeQuestionCardProps = {
  question: GigaLearnQuestion;
  ageBand: AgeBand;
  index: number;
  total: number;
  examMode?: boolean;
  onAnswered: (result: PracticeQuestionResult) => void;
  onContinue: () => void;
};

export function PracticeQuestionCard({
  question,
  ageBand,
  index,
  total,
  examMode = false,
  onAnswered,
  onContinue,
}: PracticeQuestionCardProps) {
  const ui = ageUiConfig(ageBand);
  const [selected, setSelected] = useState("");
  const [ordering, setOrdering] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setSelected("");
    setOrdering(question.options ? [...question.options] : []);
    setSubmitted(false);
    setCorrect(false);
    setShowHint(false);
  }, [question.id, question.options]);

  const canSubmit = useMemo(() => {
    if (question.type === "ordering") return ordering.length > 0;
    if (question.type === "fill_blank" || question.type === "short_answer") {
      return selected.trim().length > 0;
    }
    return selected.length > 0;
  }, [question.type, selected, ordering]);

  const submit = useCallback(() => {
    const answer =
      question.type === "ordering" ? ordering : selected;
    const result = gradeAnswer(question, answer);
    setCorrect(result.correct);
    setSubmitted(true);
    onAnswered({
      questionId: question.id,
      correct: result.correct,
      selected: answer,
    });
  }, [question, ordering, selected, onAnswered]);

  const feedback = submitted
    ? correct
      ? correctFeedback(ageBand)
      : incorrectFeedback(ageBand)
    : null;

  const optionButtonClass = (option: string, optionKey: string) => {
    const base = `w-full border text-left transition ${ui.optionClass}`;
    if (!submitted) {
      const picked = selected === optionKey;
      return `${base} ${
        picked
          ? "border-accent bg-accent/10"
          : "border-border bg-white hover:border-accent/40"
      }`;
    }
    const formattedCorrect = formatCorrectAnswer(question);
    const isCorrectOption =
      normalize(option) === normalize(formattedCorrect) ||
      normalize(optionKey) === normalize(String(question.correctAnswer));
    const wasPicked = selected === optionKey;
    if (isCorrectOption) return `${base} border-emerald-500 bg-emerald-500/10`;
    if (wasPicked && !correct) return `${base} border-rose-500 bg-rose-500/10`;
    return `${base} border-border opacity-60`;
  };

  return (
    <article
      className="rounded-3xl border border-border bg-white p-4 sm:p-6 shadow-sm"
      aria-labelledby={`practice-q-${question.id}`}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Question {index + 1} of {total}</span>
        {question.points ? <span>{question.points} pts</span> : null}
        {question.estimatedSec ? <span>~{question.estimatedSec}s</span> : null}
      </header>

      {question.visualCue ? (
        <div
          className="mb-4 flex flex-wrap justify-center gap-2 text-4xl sm:text-5xl"
          aria-hidden="true"
        >
          {question.visualCue.split(/\s+/).map((obj, i) => (
            <span key={`${obj}-${i}`} className="select-none">{obj}</span>
          ))}
        </div>
      ) : null}

      <h2 id={`practice-q-${question.id}`} className={`mb-4 text-foreground ${ui.stemClass}`}>
        {question.stem}
      </h2>

      {question.learningObjective ? (
        <p className="mb-3 text-xs text-muted">Focus: {question.learningObjective}</p>
      ) : null}

      {(question.type === "mcq" ||
        question.type === "poll" ||
        question.type === "true_false") &&
        question.options?.map((opt, i) => {
          const key = String.fromCharCode(97 + i);
          return (
            <button
              key={key}
              type="button"
              disabled={submitted}
              onClick={() => setSelected(key)}
              className={`mb-2 ${optionButtonClass(opt, key)}`}
              aria-pressed={selected === key}
            >
              <span className="mr-2 font-semibold uppercase">{key}.</span>
              {opt}
            </button>
          );
        })}

      {(question.type === "fill_blank" || question.type === "short_answer") && (
        <label className="block">
          <span className="sr-only">Your answer</span>
          <input
            type="text"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={submitted}
            className={`w-full rounded-xl border border-border bg-white px-4 py-3 text-foreground ${ui.optionClass}`}
            placeholder="Type your answer"
            autoComplete="off"
          />
        </label>
      )}

      {question.type === "ordering" && question.options && (
        <div className="space-y-2" role="list" aria-label="Put items in order">
          {ordering.map((label, pos) => (
            <div
              key={`${label}-${pos}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 p-2"
              role="listitem"
            >
              <span className="w-6 text-center text-xs text-muted">{pos + 1}</span>
              <span className="flex-1 text-sm">{label}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={submitted || pos === 0}
                  onClick={() => {
                    const next = [...ordering];
                    [next[pos - 1], next[pos]] = [next[pos], next[pos - 1]];
                    setOrdering(next);
                  }}
                  className="rounded-lg border border-border px-2 py-1 text-xs"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={submitted || pos === ordering.length - 1}
                  onClick={() => {
                    const next = [...ordering];
                    [next[pos], next[pos + 1]] = [next[pos + 1], next[pos]];
                    setOrdering(next);
                  }}
                  className="rounded-lg border border-border px-2 py-1 text-xs"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {question.hint && !submitted && (
        <button
          type="button"
          onClick={() => setShowHint(true)}
          className="mt-3 text-xs font-medium text-accent underline-offset-2 hover:underline"
        >
          Need a hint?
        </button>
      )}
      {showHint && question.hint && !submitted && (
        <p className="mt-2 rounded-xl bg-accent/5 p-3 text-sm text-muted">💡 {question.hint}</p>
      )}

      {!submitted ? (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className={`mt-6 w-full rounded-xl bg-accent font-semibold text-white disabled:opacity-40 ${ui.buttonClass}`}
        >
          Check answer
        </button>
      ) : (
        <div className="mt-6 space-y-4">
          {!examMode && feedback && (
            <div
              className={`rounded-2xl border p-4 ${
                correct
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold text-foreground">{feedback.title}</p>
              {feedback.subtitle ? (
                <p className="mt-1 text-sm text-muted">{feedback.subtitle}</p>
              ) : null}
              {!correct && (
                <p className="mt-2 text-sm font-medium text-foreground">
                  The correct answer is {formatCorrectAnswer(question)}.
                </p>
              )}
              {question.explanation ? (
                <p className="mt-3 text-sm text-foreground">{question.explanation}</p>
              ) : null}
            </div>
          )}
          {examMode && (
            <p className="text-sm text-muted" role="status">
              Answer recorded. Explanations appear after you finish the set.
            </p>
          )}
          <button
            type="button"
            onClick={onContinue}
            className={`w-full rounded-xl border border-border bg-white font-semibold text-foreground ${ui.buttonClass}`}
          >
            {index + 1 < total ? "Next question" : "See results"}
          </button>
        </div>
      )}
    </article>
  );
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
