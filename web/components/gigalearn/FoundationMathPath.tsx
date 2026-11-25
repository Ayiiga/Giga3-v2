"use client";

import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { useState } from "react";
import {
  foundationMathQuestions, MATH_STAGES, mathStageUnlocked, validMathProgress,
  type MathStage, type MathStageId,
} from "@/lib/gigalearn/foundationMathPath";
import { LearningAward } from "./LearningAward";

const control = "gigalearn-control px-3 py-2";
const primary = `${control} gigalearn-control--primary`;

const examples: Record<MathStageId, string> = {
  numbers: "Count six objects one at a time. In 235, the 2 means 200, the 3 means 30, and the 5 means 5.",
  "multiply-one": "Make 3 equal groups with 5 counters in each. Count 5, 10, 15. So 3 × 5 = 15.",
  "multiply-two": "Break 42 into 40 + 2. To find 42 × 3, add 120 + 6 = 126. For 42 × 13, add 420 + 126 = 546.",
  "multiply-three": "Break 142 into 100 + 40 + 2. To find 142 × 3, add 300 + 120 + 6 = 426. For 142 × 123, split 123 into 100 + 20 + 3, then add 14,200 + 2,840 + 426 = 17,466.",
  add: "Use place value to add 127 + 36. Work out 127 + 30 = 157, then add 6 to get 163.",
  subtract: "Find 163 − 36 by taking away 30 first to get 133, then taking away 6 to get 127.",
  divide: "Share 20 counters equally between 4 plates. Each plate gets 5 because 4 × 5 = 20.",
};

function loadProgress(key: string): MathStageId[] {
  try {
    return validMathProgress(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return [];
  }
}

function MathsCheck({ stage, onMastered, nextStage, onNext }: {
  stage: MathStage;
  onMastered: (id: MathStageId) => void;
  nextStage?: MathStage;
  onNext: (id: MathStageId) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [finished, setFinished] = useState(false);
  const questions = foundationMathQuestions(stage.id, attempt);
  const current = questions[index]!;
  const correct = picked === current.answer;

  function moveOn() {
    if (!correct) return;
    if (index + 1 === questions.length) {
      setFinished(true);
      if (!missed) onMastered(stage.id);
      return;
    }
    setIndex(index + 1);
    setPicked(null);
  }

  function restart() {
    setAttempt(attempt + 1);
    setIndex(0);
    setPicked(null);
    setMissed(false);
    setFinished(false);
  }

  return (
    <section className="gigalearn-practical space-y-4" data-learn-tone={stage.tone} aria-label={stage.label}>
      <h3 className="text-xl font-bold">{stage.label}</h3>
      <p>Get all five questions right on your first try to earn mastery for this stage. You can practise and try a fresh set whenever you’re ready.</p>
      <details className="gigalearn-play-details">
        <summary className="font-semibold">See a worked example</summary>
        <p className="mt-2">{examples[stage.id]}</p>
      </details>
      {finished ? (
        <>
          {missed ? <p role="status">Good practice. Try a fresh set when you can answer each question independently.</p>
            : <LearningAward title={`${stage.title} award`} detail="Excellent work! You answered all five questions correctly on your first try." tone={stage.tone} />}
          <div className="flex flex-wrap gap-2">
            {nextStage && !missed && (
              <button type="button" className={primary} onClick={() => onNext(nextStage.id)}>
                Continue to {nextStage.label} <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
            )}
            <button type="button" className={control} onClick={restart}>Try a fresh set</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">Question {index + 1} of {questions.length}</p>
          <fieldset className="space-y-3">
            <legend className="text-lg font-semibold">{current.prompt}</legend>
            {current.model && (
              <div className="gigalearn-practical-results space-y-2">
                {Array.from({ length: current.model.rows }, (_, row) => (
                  <div key={row} className="gigalearn-bench-counters" role="img"
                    aria-label={`Row ${row + 1}, ${current.model!.columns} counters`}>
                    {Array.from({ length: current.model!.columns }, (_, column) => <span key={column} />)}
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {current.options.map((answer) => (
                <button key={answer} type="button" className={control} data-learn-tone={stage.tone}
                  disabled={correct} aria-pressed={picked === answer} onClick={() => {
                    setPicked(answer);
                    if (answer !== current.answer) setMissed(true);
                  }}>{answer}</button>
              ))}
            </div>
          </fieldset>
          {picked !== null && <p className="gigalearn-play-message" role="status">
            <strong>{correct ? "Correct! " : "Try again. "}</strong>
            {correct ? current.explanation : current.hint}
          </p>}
          <button type="button" className={primary} data-learn-tone={stage.tone} disabled={!correct} onClick={moveOn}>
            {index + 1 === questions.length ? "See my result" : "Next question"}
          </button>
        </>
      )}
    </section>
  );
}

export function FoundationMathPath({ owner }: { owner: string | null }) {
  const storageKey = `gigalearn:foundation-maths:v1:${owner ? `account:${owner}` : "guest"}`;
  const [completed, setCompleted] = useState<MathStageId[]>(() => loadProgress(storageKey));
  const [selected, setSelected] = useState<MathStageId>(() =>
    MATH_STAGES.find((stage) => mathStageUnlocked(stage, completed) && !completed.includes(stage.id))?.id ?? "numbers");
  const stage = MATH_STAGES.find(({ id }) => id === selected)!;
  const next = MATH_STAGES.find((item) => item.requires === stage.id && !completed.includes(item.id))
    ?? MATH_STAGES.find((item) => item.id !== stage.id && mathStageUnlocked(item, completed) && !completed.includes(item.id));

  function master(id: MathStageId) {
    if (completed.includes(id)) return;
    const updated = validMathProgress([...completed, id]);
    setCompleted(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Storage may be unavailable in private browsing. Keep this session usable.
    }
  }

  return (
    <div className="space-y-4">
      <section className="gigalearn-practical space-y-3" data-learn-tone="violet" aria-label="Maths Path stages">
        <h3 className="text-xl font-bold">Maths Path</h3>
        <p className="font-semibold">{completed.length} of {MATH_STAGES.length} stages mastered</p>
        <p>Start with counting and place value. Then work through multiplication or practise addition, subtraction and division.</p>
        <div className="gigalearn-school-activities" role="group" aria-label="Choose a maths stage">
          {MATH_STAGES.map((item) => {
            const locked = !mathStageUnlocked(item, completed);
            const mastered = completed.includes(item.id);
            return (
              <button key={item.id} type="button" className={control} data-learn-tone={item.tone}
                disabled={locked} aria-pressed={selected === item.id}
                aria-describedby={locked ? `math-locked-${item.id}` : undefined} onClick={() => setSelected(item.id)}>
                {locked && <LockKeyhole aria-hidden className="h-4 w-4 shrink-0" />}
                {mastered && <Check aria-hidden className="h-4 w-4 shrink-0" />}
                {item.label}
                {locked && <span id={`math-locked-${item.id}`} className="sr-only" aria-hidden>
                  Complete {MATH_STAGES.find(({ id }) => id === item.requires)?.label} first.
                </span>}
              </button>
            );
          })}
        </div>
      </section>
      <MathsCheck key={stage.id} stage={stage} onMastered={master} nextStage={next} onNext={setSelected} />
    </div>
  );
}
