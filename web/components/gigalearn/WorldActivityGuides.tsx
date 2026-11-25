"use client";

import { LEARNING_WORLDS } from "@/lib/gigalearn/learningWorlds";
import { triggerDownload } from "@/lib/share/clientShare";
import Link from "next/link";
import { useState } from "react";
import type { WorldId } from "@/lib/gigalearn/worldChecks";

const guides: Record<WorldId, string[]> = {
  discovery: [
    "Crèche · With a caregiver, take turns rolling a soft ball. Name the action in the language you use at home. Allow the child to reply with a sound, a look or a gesture.",
    "KG · Gather a soft ball, a carton, paper and a crayon. Compare how the ball and carton move. Ask the learner to trace a carton face and describe the flat outline.",
    "Check for learning · Can the learner show the difference between the whole carton and one face? Try a different familiar object.",
  ],
  foundation: [
    "Materials · Large pieces of card or blocks, paper and pencil.",
    "Literacy · Read Mansa and the mangoes aloud. Let the learner retell it in their own words or home language, then point to the sentence that explains who got the mangoes.",
    "Mathematics · Make groups of four and two. Combine them, draw what you see, then write an equation.",
    "Check for learning · Give a different starting number and ask the learner to explain how they counted on.",
  ],
  exploration: [
    "Materials · A shallow container of water and two matching plastic bottles with lids. Keep a responsible adult nearby.",
    "Predict · Which bottle will sit lower in the water? Keep one sealed bottle empty and fill and seal the other bottle.",
    "Test · Use the same container for both. Record what you see. A bottle can float without sitting entirely above the water.",
    "Check for learning · Ask the learner to explain why keeping the bottles the same makes the comparison fair.",
  ],
  mastery: [
    "Materials · A notebook and, if available, a thermometer suitable for soil.",
    "Plan · Compare paired locations with and without shade. Record depth, time, soil condition and temperature. Repeat the comparison on several days.",
    "Discuss · Ask which observations support the claim, which do not, and what other factor could explain the difference.",
    "Check for learning · The learner proposes one further trial and explains how its result could change the conclusion.",
  ],
};

export function WorldActivityGuides() {
  const [worldId, setWorldId] = useState<WorldId>("discovery");
  const [failed, setFailed] = useState(false);
  const world = LEARNING_WORLDS.find((candidate) => candidate.id === worldId)!;

  function downloadGuide() {
    const text = [world.title, world.grades, ...guides[worldId]].join("\n\n");
    const result = triggerDownload(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      `GigaLearn-${worldId}-activity-guide.txt`,
    );
    setFailed(!result.ok);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-label="Practical activity guides">
      <h3 className="text-base font-bold">Practical activity guides</h3>
      <label className="block font-medium">
        Learning world
        <select
          className="mt-1 block min-h-12 max-w-full rounded-xl border border-border bg-card px-3"
          value={worldId}
          onChange={(event) => { setWorldId(event.target.value as WorldId); setFailed(false); }}
        >
          {LEARNING_WORLDS.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        {guides[worldId].map((step) => <li key={step}>{step}</li>)}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="gigalearn-control gigalearn-control--primary px-3 py-2" data-learn-tone="blue" onClick={downloadGuide}>Download guide</button>
        <Link href={`/gigalearn/?world=${worldId}`} className="gigalearn-control px-3 py-2" data-learn-tone="green">Open learner activity</Link>
      </div>
      {failed && <p role="status">The guide could not be downloaded. You can copy it from this page.</p>}
    </section>
  );
}
