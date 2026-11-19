"use client";

import { useState } from "react";

export type PracticeExampleProps = {
  question: string;
  options: readonly string[];
  correctIndex: number;
  explanation: string;
};

/** A public original example that works without a learner account or API credits. */
export function PracticeExample({
  question,
  options,
  correctIndex,
  explanation,
}: PracticeExampleProps) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <fieldset className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
      <legend className="px-2 font-semibold text-violet-950">
        Try an original practice question
      </legend>
      <p className="font-medium text-slate-900">{question}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
            className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 ${selected === index ? "border-violet-700 bg-violet-100 font-semibold" : "border-slate-300 bg-white"}`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="mt-4" role="status" aria-live="polite" aria-atomic="true">
        {selected !== null && (
          <p className="text-sm leading-6 text-slate-800">
            <strong>
              {selected === correctIndex
                ? "Correct."
                : `Incorrect. The correct answer is ${options[correctIndex]}.`}
            </strong>{" "}
            {explanation}
          </p>
        )}
      </div>
      <details className="mt-3 text-sm text-slate-700">
        <summary className="cursor-pointer font-semibold">
          Answer and explanation
        </summary>
        <p className="mt-2 leading-6">
          {options[correctIndex]}. {explanation}
        </p>
      </details>
    </fieldset>
  );
}
