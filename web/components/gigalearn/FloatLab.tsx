"use client";

import { Droplets, FlaskConical } from "lucide-react";
import { useState } from "react";
import { LearningAward } from "./LearningAward";

const materials = [
  { id: "wood", label: "Dry wooden block", outcome: "floats", explanation: "This block is less dense than water." },
  { id: "stone", label: "Dense solid stone", outcome: "sinks", explanation: "This stone is denser than water." },
  { id: "bottle", label: "Sealed empty plastic bottle", outcome: "floats", explanation: "Trapped air lowers the bottle’s average density." },
] as const;

type Material = (typeof materials)[number];
type Prediction = Material["outcome"];
type Trial = { material: Material["id"]; sequence: number; prediction: Prediction };

function ObjectModel({ id }: { id: Material["id"] }) {
  return <span aria-hidden className={`gigalearn-object gigalearn-object--${id}`} />;
}

export function FloatLab() {
  const [object, setObject] = useState<Material>(materials[0]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [observations, setObservations] = useState<Partial<Record<Material["id"], Prediction>>>({});
  const run = trial?.material === object.id ? trial : null;
  const completed = Object.keys(observations).length;

  function select(material: Material) {
    if (material.id === object.id) return;
    setObject(material);
    setPrediction(null);
    setTrial(null);
  }

  function testMaterial() {
    if (!prediction) return;
    setTrial({ material: object.id, sequence: (trial?.sequence ?? 0) + 1, prediction });
    setObservations((rows) => ({ ...rows, [object.id]: prediction }));
  }

  return (
    <section className="gigalearn-play-panel gigalearn-water-lab space-y-4" aria-label="Sink or float simulation">
      <header className="flex items-start gap-2">
        <Droplets className="mt-1 h-6 w-6 shrink-0 text-sky-600" aria-hidden />
        <div>
          <h3 className="text-xl font-bold">Will it sink or float?</h3>
          <p className="text-sm">Pick an object, predict, then drop it into the model tank.</p>
        </div>
      </header>

      <fieldset className="space-y-2">
        <legend className="font-semibold">Pick an object</legend>
        <div className="grid grid-cols-3 gap-2">
          {materials.map((material) => (
            <button
              type="button"
              className="gigalearn-control gigalearn-material-card"
              key={material.id}
              data-learn-tone={material.id === "wood" ? "gold" : material.id === "stone" ? "violet" : "blue"}
              aria-pressed={object.id === material.id}
              onClick={() => select(material)}
            >
              <ObjectModel id={material.id} />
              <span>{material.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="gigalearn-tank" aria-hidden>
        <div className="gigalearn-waterline" />
        <div
          key={`${object.id}-${run?.sequence ?? 0}`}
          className="gigalearn-tank-piece"
          data-position={run ? object.outcome : "ready"}
        >
          <ObjectModel id={object.id} />
        </div>
        <span className="gigalearn-tank-label">Model water tank</span>
      </div>

      <fieldset className="space-y-2">
        <legend className="font-semibold">What do you predict?</legend>
        <div className="flex flex-wrap gap-2">
          {(["floats", "sinks"] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              data-learn-tone={choice === "floats" ? "blue" : "violet"}
              className="gigalearn-control px-3"
              aria-pressed={prediction === choice}
              onClick={() => setPrediction(choice)}
            >
              {choice === "floats" ? "Floats" : "Sinks"}
            </button>
          ))}
          <button
            type="button"
            className="gigalearn-control gigalearn-control--primary px-3"
            data-learn-tone="green"
            disabled={!prediction}
            onClick={testMaterial}
          >
            <FlaskConical className="h-4 w-4" aria-hidden /> Test in the model
          </button>
        </div>
      </fieldset>

      <div className="gigalearn-play-message" role="status">
        {run ? (
          <p>
            <strong>{run.prediction === object.outcome ? "Good prediction! " : "Good investigating! "}</strong>
            You predicted it {run.prediction}. In the model, it {object.outcome}. {object.explanation}
          </p>
        ) : <p>The {object.label.toLowerCase()} is ready above the water.</p>}
      </div>

      {completed > 0 && (
        <details className="gigalearn-play-details">
          <summary className="font-semibold">Model observations · {completed} of {materials.length}</summary>
          <table className="mt-2 w-full text-left text-sm">
            <caption className="sr-only">Model observations</caption>
            <thead><tr><th scope="col">Object</th><th scope="col">Prediction</th><th scope="col">Result</th></tr></thead>
            <tbody>
              {materials.filter((item) => observations[item.id]).map((item) => (
                <tr key={item.id}>
                  <th className="py-1 pr-1 font-normal" scope="row">{item.label}</th>
                  <td className="pr-1">{observations[item.id]}</td>
                  <td>{item.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {completed === materials.length && (
        <LearningAward title="Water Investigator award" detail="You made a prediction and tested every object." />
      )}
      <details className="gigalearn-play-details">
        <summary className="font-semibold">Try it with real objects</summary>
        <p className="mt-2">With an adult, compare a sealed empty bottle with the same bottle filled with water. Use a shallow container. Record what happens in your experiment.</p>
      </details>
    </section>
  );
}
