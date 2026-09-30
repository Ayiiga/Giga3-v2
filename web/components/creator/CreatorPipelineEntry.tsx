"use client";

import { Button } from "@/components/ui/Button";
import {
  CREATOR_PIPELINE_STEPS,
  buildCreatorPipelineMediaUrl,
  starterScriptFromIdea,
} from "@/lib/creator/creatorPipeline";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Unified creator workflow entry — routes into existing Media Studio pre-production. */
export function CreatorPipelineEntry() {
  const router = useRouter();
  const [idea, setIdea] = useState("");

  function start() {
    const trimmed = idea.trim();
    const url = buildCreatorPipelineMediaUrl(
      trimmed ? starterScriptFromIdea(trimmed) : ""
    );
    router.push(url);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">One-click creator pipeline</h2>
      <p className="mt-1 text-sm text-muted">
        Idea → script → scenes → generate → edit → publish using your existing credits and tools.
      </p>
      <ol className="mt-4 flex flex-wrap gap-2">
        {CREATOR_PIPELINE_STEPS.map((step, index) => (
          <li
            key={step.id}
            className="rounded-full border border-border bg-white px-3 py-1 text-xs text-muted"
            title={step.description}
          >
            {index + 1}. {step.label}
          </li>
        ))}
      </ol>
      <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="creator-idea">
        Create a short video about…
      </label>
      <textarea
        id="creator-idea"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        rows={3}
        placeholder="Create a 45-second video about mobile money tips for students in Ghana."
        className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/30"
      />
      <Button type="button" className="mt-3" onClick={start}>
        Start in Media Studio
      </Button>
    </section>
  );
}
