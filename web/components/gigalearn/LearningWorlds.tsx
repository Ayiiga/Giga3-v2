"use client";

import { Apple, Eye, Music2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LEARNING_WORLDS } from "@/lib/gigalearn/learningWorlds";
import { getSessionToken } from "@/lib/auth";
import { offlineProgressOwner } from "@/lib/gigalearn/offlineProgressOwner";
import { DiscoveryPictureLesson } from "./DiscoveryPictureLesson";
import { DiscoveryMusic, DiscoveryPlay } from "./DiscoveryPlay";
import { FloatLab } from "./FloatLab";
import { LearningAward } from "./LearningAward";
import { FoundationReading } from "./FoundationReading";
import { ShapePractice } from "./ShapePractice";
import { WorldReviewCheck } from "./WorldReviewCheck";

const buttonStyle = "gigalearn-control px-4 py-2";
const primaryButton = "gigalearn-control gigalearn-control--primary px-4 py-2";
const panelStyle = "space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-6";

export function LearningWorlds({ worldId }: { worldId: string | null }) {
  const world = LEARNING_WORLDS.find((candidate) => candidate.id === worldId);
  if (!world) return null;
  const owner = offlineProgressOwner(getSessionToken());

  return (
    <section className="gigalearn-world-page mx-auto max-w-3xl space-y-5 px-4" aria-labelledby="world-title">
      <Link href="/gigalearn/" className="gigalearn-control px-3 text-sm">Back to Learn</Link>
      <header>
        <p className="font-semibold text-muted">{world.grades}</p>
        <h2 id="world-title" className="text-3xl font-bold">{world.title}</h2>
      </header>
      {world.id === "discovery" && <DiscoveryActivity owner={owner} />}
      {world.id === "foundation" && <FoundationActivities owner={owner} />}
      {world.id === "exploration" && <FloatLab />}
      {world.id === "mastery" && <EvidencePractice />}
      {(world.id === "exploration" || world.id === "mastery") && (
        <WorldReviewCheck key={owner} world={world.id} owner={owner} />
      )}
    </section>
  );
}

function FoundationActivities({ owner }: { owner: string | null }) {
  const [subject, setSubject] = useState<"math" | "reading">("math");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Foundation subjects">
        <button type="button" className={buttonStyle} data-learn-tone="blue" aria-pressed={subject === "math"} onClick={() => setSubject("math")}>Mathematics</button>
        <button type="button" className={buttonStyle} data-learn-tone="pink" aria-pressed={subject === "reading"} onClick={() => setSubject("reading")}>Reading</button>
      </div>
      {subject === "math" ? (
        <>
          <CountingGroups />
          <WorldReviewCheck key={owner} world="foundation" owner={owner} />
        </>
      ) : <FoundationReading />}
    </div>
  );
}

function DiscoveryActivity({ owner }: { owner: string | null }) {
  const [audience, setAudience] = useState<"look" | "creche" | "kg" | "fruit" | "music">("look");
  return (
    <div className="space-y-4">
      <div className="gigalearn-discovery-tabs" role="group" aria-label="Discovery activities">
        <button className={buttonStyle} type="button" data-learn-tone="green" aria-pressed={audience === "look"} onClick={() => setAudience("look")}><Eye aria-hidden /> Look &amp; say</button>
        <button className={buttonStyle} type="button" data-learn-tone="blue" aria-label="Fruit Finder game" aria-pressed={audience === "fruit"} onClick={() => setAudience("fruit")}><Apple aria-hidden /> Fruit Finder</button>
        <button className={buttonStyle} type="button" data-learn-tone="pink" aria-label="Songs and rhymes" aria-pressed={audience === "music"} onClick={() => setAudience("music")}><Music2 aria-hidden /> Rhythms</button>
      </div>
      {audience === "look" && <DiscoveryPictureLesson onPlay={() => setAudience("fruit")} />}
      {audience === "fruit" && <DiscoveryPlay onPractise={() => setAudience("look")} />}
      {audience === "music" && <DiscoveryMusic />}
      <details className="gigalearn-play-details">
        <summary className="font-semibold">Caregiver and KG activities</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className={buttonStyle} type="button" data-learn-tone="gold" aria-pressed={audience === "creche"} onClick={() => setAudience("creche")}>Crèche caregiver activity</button>
          <button className={buttonStyle} type="button" data-learn-tone="green" aria-pressed={audience === "kg"} onClick={() => setAudience("kg")}>KG shape activity</button>
        </div>
      </details>
      {audience === "creche" && (
        <section className={panelStyle} aria-label="Caregiver activity">
          <h3 className="text-xl font-bold">Roll and take turns</h3>
          <p>Put the screen down and sit facing the child. Roll a soft, age-appropriate ball gently toward them. Say “roll” in the language you use at home. Pause so the child can push it back or reach for it.</p>
          <p>Stay with the child and stop when they lose interest.</p>
        </section>
      )}
      {audience === "kg" && (
        <>
          <ShapePractice />
          <WorldReviewCheck key={owner} world="discovery" owner={owner} />
        </>
      )}
    </div>
  );
}

function CountingGroups() {
  const [moved, setMoved] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  return (
    <section className={panelStyle} aria-label="Counting groups activity">
      <h3 className="text-xl font-bold">How many are in the basket?</h3>
      <p>Put three real fruits or blocks together. Use the picture counters to add two more.</p>
      <div className="flex min-h-16 flex-wrap items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 p-3 dark:bg-amber-950" role="img" aria-label={`${3 + moved} counters in the basket`}>
        {Array.from({ length: 3 + moved }, (_, index) => (
          <img
            key={index}
            src="/gigalearn/media/ghana/kg2/hq/mango.webp"
            alt=""
            width="36"
            height="36"
            className={`h-9 w-9 rounded-lg border-2 object-cover ${index < 3 ? "border-violet-500" : "border-amber-500"}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButton} data-learn-tone="blue" disabled={moved === 2} onClick={() => setMoved((value) => Math.min(2, value + 1))}>Add a counter</button>
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
      {total === 5 && <LearningAward title="Counting Builder award" detail="You joined two groups and counted all five." />}
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
          <button type="button" key={option} aria-pressed={picked === index} className={buttonStyle + " gigalearn-control--choice"} onClick={() => setPicked(index)}>{option}</button>
        ))}
      </div>
      <p role="status" className="min-h-12">
        {picked === 1 ? "The paired observations compare the conditions directly. Check the actual temperatures and whether the soil and measuring method were comparable." : picked !== null ? "This source offers no repeated comparison. Look for observations taken under comparable conditions." : ""}
      </p>
      {picked === 1 && (
        <p>On paper, design a check for your school grounds. State what you would measure, what you would keep the same, and what evidence would change your conclusion.</p>
      )}
      <Link href="/gigalearn/exam/bece/" className="gigalearn-control gigalearn-control--primary px-3 text-sm" data-learn-tone="violet">Open BECE practice</Link>
    </section>
  );
}
