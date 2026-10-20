"use client";

import { ExamPracticeShareButton } from "@/components/gigalearn/exam/ExamPracticeShareButton";
import { Button } from "@/components/ui/Button";
import { recordLocalExamPracticeResult } from "@/lib/gigalearn/examPractice/localProgress";
import {
  rewardForCorrectAnswer,
  rewardForSessionScore,
} from "@/lib/gigalearn/examPractice/rewardCopy";
import type { ExamPracticeQuestion, ExamPracticeSetMeta } from "@/lib/gigalearn/examPractice/types";
import { optionIds, scoreQuiz, type QuizAnswerMap } from "@/lib/gigalearn/examPractice/quizEngine";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  meta: ExamPracticeSetMeta;
  questions: ExamPracticeQuestion[];
  exitHref: string;
  /** Visual theme: teacher green or bece violet shell */
  theme?: "teacher" | "bece";
};

export function ExamQuizSession({ meta, questions, exitHref, theme = "teacher" }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswerMap>({});
  const [secondsLeft, setSecondsLeft] = useState(meta.durationMinutes * 60);
  const [finished, setFinished] = useState(false);
  const [reward, setReward] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const recordedRef = useRef(false);

  const current = questions[index];
  const selected = current ? answers[current.id] : undefined;
  const revealed = Boolean(selected);
  const score = useMemo(() => scoreQuiz(questions, answers), [questions, answers]);

  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setFinished(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [finished]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    recordLocalExamPracticeResult({
      setId: meta.id,
      category: meta.category,
      correct: score.correct,
      total: score.total,
      percent: score.percent,
      finishedAt: Date.now(),
    });
  }, [finished, meta.category, meta.id, score.correct, score.percent, score.total]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progressPct = questions.length
    ? Math.round(((index + 1) / questions.length) * 100)
    : 0;

  const bannerTitle =
    theme === "bece"
      ? "BECE Preparation Practice"
      : "Promotion Exam Preparation Practice";

  if (!current || finished) {
    const sessionPraise = rewardForSessionScore(score.percent);
    return (
      <div className={cn("exam-session", theme === "bece" && "exam-session--bece")}>
        <ExamSessionHeader title={meta.title} theme={theme} />
        <div className="exam-session-body">
          <article className="exam-session-card exam-session-results">
            <p className="exam-session-kicker">Results</p>
            <h2 className="exam-session-title">Practice complete</h2>
            {sessionPraise ? (
              <p className="exam-session-reward" role="status">
                {sessionPraise}
              </p>
            ) : null}
            <p className="exam-session-note">{meta.provenanceNote}</p>
            <dl className="exam-session-scoregrid">
              <div className="exam-session-scorecell exam-session-scorecell--accent">
                <dt>Score</dt>
                <dd>{String(score.percent) + "%"}</dd>
              </div>
              <div className="exam-session-scorecell">
                <dt>Correct</dt>
                <dd>
                  {score.correct}/{score.total}
                </dd>
              </div>
              <div className="exam-session-scorecell">
                <dt>Answered</dt>
                <dd>{score.answered}</dd>
              </div>
            </dl>
            <div className="exam-session-actions">
              <Button
                type="button"
                className="exam-session-btn-primary min-h-11 w-full"
                onClick={() => {
                  setAnswers({});
                  setIndex(0);
                  setSecondsLeft(meta.durationMinutes * 60);
                  setFinished(false);
                  setReward(null);
                  setStreak(0);
                  recordedRef.current = false;
                }}
              >
                Practise again
              </Button>
              <ExamPracticeShareButton
                kind={meta.category === "bece" ? "bece" : "teacher_promotion"}
                label="Share this practice"
              />
              <Link href={exitHref} className="exam-session-btn-secondary min-h-11 w-full">
                Back to Exam Practice
              </Link>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("exam-session", theme === "bece" && "exam-session--bece")}>
      <ExamSessionHeader title={bannerTitle} theme={theme} />
      <div className="exam-session-toolbar">
        <Link
          href={exitHref}
          className="exam-session-close"
          aria-label="Close practice"
        >
          <X className="h-5 w-5" />
        </Link>
        <div className="exam-session-toolbar-center">
          <p className="exam-session-toolbar-title">
            Question {index + 1} of {questions.length}
          </p>
          <div className="exam-session-progress" aria-hidden>
            <div className="exam-session-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="exam-session-toolbar-sub">
            {score.answered} answered
            {streak > 1 ? ` · streak ${streak}` : ""}
          </p>
        </div>
        <div className="exam-session-timer" aria-live="polite">
          <span className="exam-session-timer-label">Time left</span>
          <span className="exam-session-timer-value">
            {mm}:{ss}
          </span>
        </div>
      </div>

      <div className="exam-session-body">
        <article className="exam-session-card exam-session-card--pad">
          <div className="exam-session-chips">
            {current.audience ? (
              <span className="exam-session-chip">{current.audience}</span>
            ) : null}
            <span className="exam-session-chip exam-session-chip--muted">{current.topic}</span>
          </div>
          <p className="exam-session-kicker">Question {index + 1}</p>
          <h2 className="exam-session-stem">{current.stem}</h2>

          <ul className="exam-session-options">
            {optionIds().map((oid) => {
              const isSelected = selected === oid;
              const isCorrect = oid === current.correct;
              const showCorrect = revealed && isCorrect;
              const showWrong = revealed && isSelected && !isCorrect;
              return (
                <li key={oid}>
                  <button
                    type="button"
                    disabled={revealed}
                    onClick={() => {
                      if (revealed) return;
                      const ok = oid === current.correct;
                      setAnswers((prev) => ({
                        ...prev,
                        [current.id]: oid,
                      }));
                      if (ok) {
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
                    }}
                    className={cn(
                      "exam-session-option",
                      showCorrect && "exam-session-option--correct",
                      showWrong && "exam-session-option--wrong",
                      !revealed && isSelected && "exam-session-option--picked"
                    )}
                  >
                    <span className="exam-session-option-letter">{oid}.</span>
                    <span className="exam-session-option-text">{current.options[oid]}</span>
                    {showCorrect ? <Check className="exam-session-icon-ok" aria-hidden /> : null}
                    {showWrong ? <X className="exam-session-icon-bad" aria-hidden /> : null}
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

          {revealed ? (
            <div className="exam-session-explain" role="status">
              <p>
                <span className="exam-session-explain-label">Explanation: </span>
                {current.explanation}
              </p>
            </div>
          ) : null}
        </article>
      </div>

      <div className="exam-session-footer">
        <button
          type="button"
          className="exam-session-btn-secondary"
          disabled={index === 0}
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1));
            setReward(null);
          }}
        >
          ← Previous
        </button>
        {index >= questions.length - 1 ? (
          <button
            type="button"
            className="exam-session-btn-primary"
            onClick={() => setFinished(true)}
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            className="exam-session-btn-primary"
            onClick={() => {
              setIndex((i) => Math.min(questions.length - 1, i + 1));
              setReward(null);
            }}
          >
            Next →
          </button>
        )}
      </div>
      <p className="exam-session-footnote">{meta.provenanceNote}</p>
    </div>
  );
}

function ExamSessionHeader({
  title,
  theme,
}: {
  title: string;
  theme: "teacher" | "bece";
}) {
  return (
    <header className="exam-session-banner">
      <div className="exam-ghana-stripe" aria-hidden />
      <div className="exam-session-banner-inner">
        <h1 className="exam-session-banner-title">{title}</h1>
        <p className="exam-session-banner-sub">
          {theme === "bece"
            ? "Independent practice for BECE preparation on GigaLearn — not an official WAEC paper"
            : "Independent practice platform for Ghana Education Service promotion-exam preparation"}
        </p>
      </div>
    </header>
  );
}
