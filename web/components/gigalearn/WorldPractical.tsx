"use client";

import { BarChart3, Beaker, ClipboardList, Paperclip, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { WorldPractical as Practical } from "@/lib/gigalearn/worldPracticals";
import { LearningAward } from "./LearningAward";

const control = "gigalearn-control px-3 py-2";
const options = [0, 1] as const;
const marketGoods = [
  { count: 3, image: "/gigalearn/media/ghana/kg2/hq/orange.webp" },
  { count: 2, image: "/gigalearn/media/ghana/kg2/hq/mango.webp" },
] as const;

export function WorldPractical({ lesson }: { lesson: Practical }) {
  const [prediction, setPrediction] = useState<0 | 1 | null>(null);
  const [tested, setTested] = useState([false, false]);
  const [answer, setAnswer] = useState<0 | 1 | null>(null);
  const compared = tested.every(Boolean);
  const correct = answer === lesson.answer;
  const max = Math.max(...lesson.trials.map(({ value }) => value));

  function reset() {
    setPrediction(null);
    setTested([false, false]);
    setAnswer(null);
  }

  return (
    <section className="gigalearn-practical space-y-4" data-learn-tone={lesson.tone} aria-labelledby={`practical-${lesson.id}`}>
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Beaker aria-hidden className="h-6 w-6 shrink-0" />
          <h3 id={`practical-${lesson.id}`} className="text-xl font-bold">{lesson.title}</h3>
        </div>
        <p>{lesson.introduction}</p>
      </header>
      <fieldset className="space-y-2">
        <legend className="font-semibold">{lesson.prediction}</legend>
        <div className="grid grid-cols-2 gap-2">
          {options.map((index) => (
            <button key={index} type="button" className={control} aria-pressed={prediction === index}
              disabled={tested.some(Boolean)} onClick={() => setPrediction(index)}>
              {lesson.trials[index].label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="gigalearn-practical-results space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <BarChart3 aria-hidden className="h-5 w-5 shrink-0" /> {lesson.resultType}
        </div>
        <p className="text-sm">{lesson.measure}</p>
        {options.map((index) => {
          const trial = lesson.trials[index];
          return (
            <div key={trial.label} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{trial.label}</span>
                <button type="button" aria-label={`Test ${trial.label}`} className={control}
                  disabled={prediction === null || tested[index]}
                  onClick={() => setTested((previous) => previous.map((value, trialIndex) => value || trialIndex === index))}>
                  {tested[index] ? "Tested" : "Test"}
                </button>
              </div>
              {tested[index] && (
                <div aria-live="polite">
                  <p className="text-sm">{trial.readings && `${trial.readings} · `}<strong>{trial.value} {lesson.unit}</strong></p>
                  {lesson.id === "measure" && (
                    <div className="gigalearn-practical-units" aria-hidden>
                      {Array.from({ length: trial.value }, (_, clip) => <Paperclip key={clip} />)}
                    </div>
                  )}
                  {lesson.id === "market" && (
                    <div className="gigalearn-practical-units" aria-hidden>
                      {Array.from({ length: marketGoods[index].count }, (_, fruit) => (
                        <img key={fruit} src={marketGoods[index].image} width="32" height="32" alt="" />
                      ))}
                    </div>
                  )}
                  <div className="gigalearn-practical-track" aria-hidden>
                    <span style={{ width: `${trial.value / max * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {compared && (
        <div className="space-y-3">
          <p role="status" className="font-semibold">
            {prediction === lesson.correct ? "Excellent prediction! " : "Good investigating! "}
            {lesson.trials[lesson.correct].label} had the larger result.
          </p>
          <fieldset className="space-y-2">
            <legend className="font-semibold">{lesson.challenge}</legend>
            {options.map((index) => (
              <button key={index} type="button" aria-pressed={answer === index} className={control + " gigalearn-control--choice w-full"}
                onClick={() => setAnswer(index)}>{lesson.choices[index]}</button>
            ))}
          </fieldset>
          {answer !== null && <p role="status">{correct ? lesson.explanation : lesson.hint}</p>}
        </div>
      )}
      {correct && (
        <LearningAward title={`${lesson.award} award`} detail={lesson.achievement} tone={lesson.tone} />
      )}
      <details className="gigalearn-play-details">
        <summary className="font-semibold">Try it away from the screen</summary>
        <p className="mt-2 flex gap-2"><ClipboardList aria-hidden className="h-5 w-5 shrink-0" />{lesson.mission}</p>
      </details>
      {prediction !== null && (
        <button type="button" className={control} onClick={reset}><RotateCcw aria-hidden className="h-4 w-4" /> Start again</button>
      )}
    </section>
  );
}
