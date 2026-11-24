"use client";

import Link from "next/link";
import { useState } from "react";
import { LEARNING_WORLDS } from "@/lib/gigalearn/learningWorlds";
import { ShapePractice } from "./ShapePractice";

const buttonStyle = "min-h-12 rounded-xl border border-violet-500/40 px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 aria-pressed:bg-violet-700 aria-pressed:text-white disabled:opacity-50";
const primaryButton = buttonStyle + " bg-violet-700 text-white";
const panelStyle = "space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-6";

export function LearningWorlds({ worldId }: { worldId: string | null }) {
  const world = LEARNING_WORLDS.find((candidate) => candidate.id === worldId);
  if (!world) return null;

  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 pb-8" aria-labelledby="world-title">
      <Link href="/gigalearn/" className="inline-flex min-h-12 items-center underline">Back to Learn</Link>
      <header>
        <p className="font-semibold text-muted">{world.grades}</p>
        <h2 id="world-title" className="text-3xl font-bold">{world.title}</h2>
      </header>
      {world.id === "discovery" && <DiscoveryActivity />}
      {world.id === "foundation" && <CountingGroups />}
      {world.id === "exploration" && <FloatModel />}
      {world.id === "mastery" && <EvidencePractice />}
    </section>
  );
}

function DiscoveryActivity() {
  const [audience, setAudience] = useState<"creche" | "kg" | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="Discovery activities">
        <button className={buttonStyle} type="button" aria-pressed={audience === "creche"} onClick={() => setAudience("creche")}>Crèche caregiver activity</button>
        <button className={buttonStyle} type="button" aria-pressed={audience === "kg"} onClick={() => setAudience("kg")}>KG shape activity</button>
      </div>
      {audience === "creche" && (
        <section className={panelStyle} aria-label="Caregiver activity">
          <h3 className="text-xl font-bold">Roll and take turns</h3>
          <p>Put the screen down and sit facing the child. Roll a soft, age-appropriate ball gently toward them. Say “roll” in the language you use at home. Pause so the child can push it back or reach for it.</p>
          <p>Stay with the child and stop when they lose interest.</p>
        </section>
      )}
      {audience === "kg" && <ShapePractice />}
    </div>
  );
}

function CountingGroups() {
  const [moved, setMoved] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  return (
    <section className={panelStyle} aria-label="Counting groups activity">
      <h3 className="text-xl font-bold">How many are in the basket?</h3>
      <p>Set out three large blocks. Place two more beside them. Now use the counters to show what happens when you combine the groups.</p>
      <div className="flex min-h-16 items-center gap-2 rounded-xl border border-border p-3" aria-label={`${3 + moved} counters in the basket`}>
        {Array.from({ length: 3 + moved }, (_, index) => (
          <span key={index} aria-hidden className={`h-8 w-8 rounded-full ${index < 3 ? "bg-violet-700" : "bg-amber-500"}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButton} disabled={moved === 2} onClick={() => setMoved((value) => Math.min(2, value + 1))}>Add a counter</button>
        <button type="button" className={buttonStyle} disabled={moved === 0} onClick={() => { setMoved(0); setTotal(null); }}>Start again</button>
      </div>
      <p role="status">{moved} of 2 extra counters added.</p>
      {moved === 2 && (
        <fieldset className="space-y-2">
          <legend className="font-semibold">3 + 2 = ?</legend>
          <div className="flex gap-2">
            {[4, 5, 6].map((choice) => (
              <button type="button" key={choice} aria-pressed={total === choice} className={buttonStyle} onClick={() => setTotal(choice)}>{choice}</button>
            ))}
          </div>
          {total !== null && (
            <p role="status">{total === 5 ? "Correct. Count on from three: four, five. Try four blocks and two more with the real blocks." : "Start at three and count on once for each extra counter."}</p>
          )}
        </fieldset>
      )}
    </section>
  );
}

const floatObjects = [
  { id: "wood", label: "Dry wooden block", outcome: "floats", explanation: "In this model, the block is less dense than water." },
  { id: "stone", label: "Dense solid stone", outcome: "sinks", explanation: "In this model, the stone is denser than water." },
  { id: "bottle", label: "Sealed empty plastic bottle", outcome: "floats", explanation: "The trapped air lowers the average density of the bottle and its contents." },
] as const;

function FloatModel() {
  const [objectIndex, setObjectIndex] = useState(0);
  const [prediction, setPrediction] = useState<"floats" | "sinks" | null>(null);
  const [observations, setObservations] = useState<Partial<Record<string, "floats" | "sinks">>>({});
  const object = floatObjects[objectIndex]!;
  const observed = observations[object.id];

  return (
    <section className={panelStyle} aria-label="Sink or float simulation">
      <h3 className="text-xl font-bold">Will it sink or float?</h3>
      <p>In this simulation, choose an object, make a prediction, then release it into the model tank.</p>
      <label className="block font-semibold">
        Object
        <select className="mt-1 block min-h-12 max-w-full rounded-xl border border-border bg-card p-2" value={objectIndex} onChange={(event) => { setObjectIndex(Number(event.target.value)); setPrediction(null); }}>
          {floatObjects.map((item, index) => <option key={item.id} value={index}>{item.label}</option>)}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="font-semibold">What do you predict?</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonStyle} aria-pressed={prediction === "floats"} onClick={() => setPrediction("floats")}>Floats</button>
          <button type="button" className={buttonStyle} aria-pressed={prediction === "sinks"} onClick={() => setPrediction("sinks")}>Sinks</button>
          <button type="button" className={primaryButton} disabled={!prediction} onClick={() => {
            if (prediction) setObservations((rows) => ({ ...rows, [object.id]: prediction }));
          }}>Test in the model</button>
        </div>
      </fieldset>
      <div role="status" className="min-h-12">
        {observed && <p>You predicted it {observed}. In the model, it {object.outcome}. {object.explanation}</p>}
      </div>
      {Object.keys(observations).length > 0 && (
        <table className="w-full text-left text-sm">
          <caption className="text-left font-semibold">Model observations</caption>
          <thead><tr><th scope="col">Object</th><th scope="col">Prediction</th><th scope="col">Result</th></tr></thead>
          <tbody>
            {floatObjects.filter((item) => observations[item.id]).map((item) => (
              <tr key={item.id}><th className="py-1 font-normal" scope="row">{item.label}</th><td>{observations[item.id]}</td><td>{item.outcome}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <p>With an adult, compare a sealed empty bottle and the same bottle filled with water in a shallow container. Record what you actually observe.</p>
    </section>
  );
}

function EvidencePractice() {
  const [picked, setPicked] = useState<number | null>(null);
  const options = [
    "A popular post says shade always makes soil cooler.",
    "A class compared paired shaded and unshaded plots at the same time on five days.",
    "A friend remembers that one shaded place felt cool.",
  ];
  return (
    <section className={panelStyle} aria-label="Evidence evaluation">
      <h3 className="text-xl font-bold">Which evidence supports the claim?</h3>
      <p>Someone claims that shade makes the soil cooler at midday. Choose the source you would examine first to investigate that claim.</p>
      <div className="grid gap-2">
        {options.map((option, index) => (
          <button type="button" key={option} aria-pressed={picked === index} className={buttonStyle + " text-left"} onClick={() => setPicked(index)}>{option}</button>
        ))}
      </div>
      <p role="status" className="min-h-12">
        {picked === 1 ? "The paired observations compare the conditions directly. Check the actual temperatures and whether the soil and measuring method were comparable." : picked !== null ? "This source offers no repeated comparison. Look for observations taken under comparable conditions." : ""}
      </p>
      {picked === 1 && (
        <p>On paper, design a check for your school grounds. State what you would measure, what you would keep the same, and what evidence would change your conclusion.</p>
      )}
      <Link href="/gigalearn/exam/bece/" className="inline-flex min-h-12 items-center underline">Open BECE practice</Link>
    </section>
  );
}
