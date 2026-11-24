"use client";

import { useState } from "react";
import { worldCheck, type WorldId } from "@/lib/gigalearn/worldChecks";
import {
  loadWorldReview,
  nextWorldReview,
  saveWorldReview,
} from "@/lib/gigalearn/worldReview";

const optionStyle = "min-h-12 rounded-xl border border-violet-500/40 px-4 py-2 text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 aria-pressed:bg-violet-700 aria-pressed:text-white disabled:opacity-60";

export function WorldReviewCheck({ world, owner }: { world: WorldId; owner: string | null }) {
  const [review, setReview] = useState(() => owner ? loadWorldReview(owner, world) : null);
  const [variant, setVariant] = useState(review?.nextVariant ?? 0);
  const [choice, setChoice] = useState<number | null>(null);
  const [hintCount, setHintCount] = useState(0);
  const [result, setResult] = useState<{ correct: boolean; saved: boolean } | null>(null);
  const question = worldCheck(world, variant);

  function submit() {
    if (choice === null || result) return;
    const correct = choice === question.answer;
    const next = nextWorldReview(review, { correct, usedHint: hintCount > 0 });
    setReview(next);
    setResult({ correct, saved: owner ? saveWorldReview(owner, world, next) : false });
  }

  function retry() {
    setVariant((current) => (current + 1) % 2);
    setChoice(null);
    setHintCount(0);
    setResult(null);
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-6" aria-label="Practice and review">
      <h3 className="text-xl font-bold">Try a new example</h3>
      <fieldset className="space-y-3">
        <legend className="mb-2 font-semibold">{question.prompt}</legend>
        <div className="grid gap-2">
          {question.choices.map((option, index) => (
            <button
              className={optionStyle}
              type="button"
              key={option}
              aria-pressed={choice === index}
              disabled={result !== null}
              onClick={() => setChoice(index)}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={optionStyle}
            type="button"
            disabled={result !== null || hintCount === question.hints.length}
            onClick={() => setHintCount((count) => Math.min(count + 1, question.hints.length))}
          >
            {hintCount === 0 ? "Show a hint" : "Show another hint"}
          </button>
          <button
            className={optionStyle + " bg-violet-700 text-white"}
            type="button"
            disabled={choice === null || result !== null}
            onClick={submit}
          >
            Check answer
          </button>
        </div>
      </fieldset>
      <div aria-live="polite">
        {hintCount > 0 && !result && <p>{question.hints[hintCount - 1]}</p>}
        {result && (
          <div className="space-y-2">
            <p><strong>{result.correct ? "Correct. " : "Keep practising. "}</strong>{question.explanation}</p>
            {result.correct && <p>{question.transfer}</p>}
            {result.saved && review && (
              <p className="text-sm text-muted">
                {review.stage < 0
                  ? "Review is ready now."
                  : `Next review on this device: ${new Date(review.dueAt).toLocaleDateString()}.`}
              </p>
            )}
            {owner && !result.saved && <p className="text-sm text-muted">This device could not save your review date.</p>}
          </div>
        )}
      </div>
      {result && <button type="button" className={optionStyle} onClick={retry}>Try another example</button>}
      {!owner && <p className="text-sm text-muted">Sign in to save review dates on this device.</p>}
    </section>
  );
}
