"use client";

import { useState } from "react";

const questions = [
  {
    prompt: "Roll a ball in two directions. Which solid shape is it like?",
    choices: ["Circle", "Sphere"],
    answer: "Sphere",
    explanation: "A sphere is round all the way around. A circle is flat, like a drawing on paper.",
  },
  {
    prompt: "Turn a rectangular carton over. What shape is the whole carton?",
    choices: ["Cuboid", "Rectangle"],
    answer: "Cuboid",
    explanation: "A cuboid has six faces. A single flat face of the carton can be a rectangle.",
  },
  {
    prompt: "Look at a block with six equal square faces. What is the whole block called?",
    choices: ["Square", "Cube"],
    answer: "Cube",
    explanation: "A cube is solid and has six equal square faces. Each face on its own is a flat square.",
  },
];

export function ShapePractice() {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const question = questions[step];
  const correct = choice === question?.answer;

  function advance() {
    setChoice(null);
    setStep(question ? step + 1 : 0);
  }

  return (
    <section
      aria-labelledby="shape-practice-title"
      className="space-y-3 rounded-3xl border border-border bg-accent/5 p-4 text-foreground"
    >
      <h3 id="shape-practice-title" className="text-lg font-bold">Flat and solid shapes</h3>
      {question ? (
        <fieldset className="space-y-3">
          <legend className="font-semibold">{question.prompt}</legend>
          <p className="text-sm text-muted">Question {step + 1} of {questions.length}</p>
          <div className="grid grid-cols-2 gap-2">
            {question.choices.map((answer) => (
              <button
                key={answer}
                type="button"
                aria-pressed={choice === answer}
                onClick={() => setChoice(answer)}
                className="min-h-12 rounded-xl border border-accent/40 px-2 font-semibold aria-pressed:bg-violet-700 aria-pressed:text-white"
              >
                {answer}
              </button>
            ))}
          </div>
          <p role="status" className="min-h-12 text-sm">
            {choice && <><strong>{correct ? "Correct. " : "Try again. "}</strong>{question.explanation}</>}
          </p>
          <button
            type="button"
            disabled={!correct}
            onClick={advance}
            className="min-h-12 rounded-xl bg-violet-700 px-4 font-semibold text-white disabled:opacity-50"
          >
            {step === questions.length - 1 ? "See the home activity" : "Next question"}
          </button>
        </fieldset>
      ) : (
        <div className="space-y-3">
          <p role="status">With an adult, trace one face of a carton on paper. Point to the flat shape you drew, then explain how it differs from the whole carton.</p>
          <button type="button" onClick={advance} className="min-h-12 rounded-xl bg-violet-700 px-4 font-semibold text-white">
            Play again
          </button>
        </div>
      )}
    </section>
  );
}
