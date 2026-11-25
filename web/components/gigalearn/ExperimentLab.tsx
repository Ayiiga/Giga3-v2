"use client";

import { Activity, Box, Cog, Droplets, FlaskConical, Lightbulb, Magnet, RotateCcw } from "lucide-react";
import { useState } from "react";
import { EXPERIMENTS, type Experiment, type LabTopic } from "@/lib/gigalearn/experimentLab";
import { LearningAward } from "./LearningAward";

const control = "gigalearn-control px-3 py-2";
const topics: readonly LabTopic[] = ["Motion", "Light and sound", "Materials and energy"];
const format = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

function displayResult(experiment: Experiment, value: number) {
  if (!experiment.unit) return value > 0 ? "Yes" : "No";
  return `${format.format(value)}${experiment.unit === "°" || experiment.unit === "%" ? "" : " "}${experiment.unit}`;
}

function ModelStage({ experiment, value, maximum }: { experiment: Experiment; value?: number; maximum: number }) {
  const percent = value === undefined ? 0 : value / maximum * 100;
  const hasResult = value !== undefined;
  const SceneIcon = experiment.id === "water-jet" ? Droplets : Box;
  return (
    <div className="gigalearn-experiment-model" aria-hidden data-scene={experiment.scene} data-active={hasResult && value > 0}>
      {experiment.id === "mirror" ? (
        <div className="gigalearn-mirror">
          <span className="gigalearn-mirror-normal" />
          {hasResult && (
            <>
              <span className="gigalearn-mirror-ray" style={{ rotate: `-${value}deg` }} />
              <span className="gigalearn-mirror-ray" style={{ rotate: `${value}deg` }} />
            </>
          )}
        </div>
      ) : experiment.id === "pendulum" ? (
        <div className="gigalearn-pendulum" style={{ height: `${hasResult ? 30 + (percent / 100) ** 2 * 42 : 30}px`, animationDuration: `${value ?? 2}s` }}>
          <span />
        </div>
      ) : experiment.id === "spring" ? (
        <div className="gigalearn-model-spring" style={{ height: `${20 + percent * 0.46}px` }}><Box /></div>
      ) : experiment.id === "gears" ? (
        <div className="gigalearn-model-gears">
          <Cog />
          <Cog style={{ width: `${2 + (100 - percent) * 0.025}rem`, height: `${2 + (100 - percent) * 0.025}rem` }} />
        </div>
      ) : experiment.id === "circuit" ? (
        <div className="gigalearn-model-circuit" data-closed={hasResult && value > 0}>
          <Lightbulb style={{ fill: hasResult && value > 0 ? "#ffdc63" : "none" }} />
          <span>+ −</span>
        </div>
      ) : experiment.scene === "magnet" ? (
        <div className="gigalearn-experiment-magnet">
          <Magnet />
          <Box style={{ marginInlineStart: hasResult && value > 0 ? "0.2rem" : "3rem" }} />
        </div>
      ) : experiment.scene === "light" ? (
        <Lightbulb style={{ fill: hasResult ? `rgb(255 218 89 / ${percent / 100})` : "none" }} />
      ) : experiment.scene === "motion" ? (
        <div className="gigalearn-experiment-track">
          <SceneIcon style={{ left: `${percent}%` }} />
        </div>
      ) : (
        <div className="gigalearn-experiment-meter">
          {experiment.scene === "wave" && <Activity />}
          <span className="gigalearn-experiment-meter-track"><span style={{ width: `${percent}%` }} /></span>
        </div>
      )}
      <span className="gigalearn-experiment-caption">Virtual model</span>
    </div>
  );
}

function ExperimentWorkbench({ experiment }: { experiment: Experiment }) {
  const [prediction, setPrediction] = useState<number | null>(null);
  const [setting, setSetting] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const [runs, setRuns] = useState<number[]>([]);
  const values = experiment.settings.map(({ value }) => experiment.result(value));
  const maximum = Math.max(...values);
  const best = experiment.goal === "min" ? Math.min(...values) : maximum;
  const complete = runs.length === experiment.settings.length;

  function run() {
    if (prediction === null) return;
    setLast(setting);
    setRuns((previous) => previous.includes(setting) ? previous : [...previous, setting]);
  }

  function reset() {
    setPrediction(null);
    setSetting(0);
    setLast(null);
    setRuns([]);
  }

  return (
    <section className="gigalearn-practical space-y-4" data-learn-tone="blue" aria-labelledby="experiment-title">
      <h3 id="experiment-title" className="text-xl font-bold">{experiment.title}</h3>
      <fieldset className="space-y-2">
        <legend className="font-semibold">{experiment.question}</legend>
        <div className="gigalearn-experiment-choices">
          {experiment.settings.map(({ label }, index) => (
            <button key={label} type="button" className={control} aria-pressed={prediction === index}
              disabled={runs.length > 0} onClick={() => setPrediction(index)}>{label}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="font-semibold">Change the test setting</legend>
        <div className="gigalearn-experiment-choices">
          {experiment.settings.map(({ label }, index) => (
            <button key={label} type="button" className={control} data-learn-tone="blue" aria-pressed={setting === index}
              onClick={() => setSetting(index)}>{label}</button>
          ))}
        </div>
      </fieldset>
      <ModelStage experiment={experiment} value={last === null ? undefined : values[last]} maximum={maximum} />
      <button type="button" className={control + " gigalearn-control--primary"} data-learn-tone="green"
        disabled={prediction === null} onClick={run}>
        <FlaskConical className="h-5 w-5" aria-hidden /> Run model
      </button>
      {last !== null && (
        <p className="gigalearn-play-message" role="status">
          <strong>{experiment.settings[last].label}.</strong> {experiment.measure}: {displayResult(experiment, values[last])}
        </p>
      )}
      {runs.length > 0 && (
        <div className="gigalearn-practical-results space-y-2">
          <h4 className="font-semibold">Recorded results · {runs.length} of {experiment.settings.length}</h4>
          <dl className="space-y-2">
            {runs.map((index) => (
              <div key={index} className="flex flex-wrap justify-between gap-x-3">
                <dt>{experiment.settings[index].label}</dt>
                <dd className="font-semibold">{displayResult(experiment, values[index])}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {complete && prediction !== null && (
        <>
          <p><strong>{values[prediction] === best ? "Excellent prediction!" : "Good investigating!"}</strong> {experiment.explanation}</p>
          <LearningAward title="Brilliant Investigator award" detail="You tested every setting and compared the results." tone="blue" />
        </>
      )}
      <details className="gigalearn-play-details">
        <summary className="font-semibold">Classroom investigation</summary>
        <p className="mt-2">{experiment.classroom}</p>
      </details>
      {prediction !== null && (
        <button type="button" className={control} onClick={reset}><RotateCcw aria-hidden className="h-4 w-4" /> Start again</button>
      )}
    </section>
  );
}

export function ExperimentLab() {
  const [topic, setTopic] = useState<LabTopic>("Motion");
  const [selection, setSelection] = useState(EXPERIMENTS.find((experiment) => experiment.topic === "Motion")!);
  return (
    <div className="space-y-4">
      <div className="gigalearn-practical space-y-3" data-learn-tone="blue">
        <h3 className="text-xl font-bold">Experiment Lab</h3>
        <p>{EXPERIMENTS.length} models to predict, test and compare.</p>
        <div className="gigalearn-experiment-choices" role="group" aria-label="Experiment topics">
          {topics.map((item) => (
            <button key={item} className={control} type="button" aria-pressed={topic === item} onClick={() => {
              setTopic(item);
              setSelection(EXPERIMENTS.find((experiment) => experiment.topic === item)!);
            }}>{item}</button>
          ))}
        </div>
        <label className="grid gap-1 font-semibold">
          Choose an experiment
          <select className="gigalearn-experiment-select" value={selection.id} onChange={(event) => {
            setSelection(EXPERIMENTS.find((experiment) => experiment.id === event.target.value)!);
          }}>
            {EXPERIMENTS.filter((experiment) => experiment.topic === topic).map((experiment) => (
              <option key={experiment.id} value={experiment.id}>{experiment.title}</option>
            ))}
          </select>
        </label>
      </div>
      <ExperimentWorkbench key={selection.id} experiment={selection} />
    </div>
  );
}
