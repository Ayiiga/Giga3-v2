"use client";

import { CreatorResultPanel } from "@/components/creator-studio/CreatorResultPanel";
import { Button } from "@/components/ui/Button";
import { useCreatorGeneration } from "@/hooks/useCreatorGeneration";
import {
  contentPotential,
  contentRecommendations,
  type ContentSourceType,
} from "@/lib/content-engine/starter";
import { cn } from "@/lib/utils";
import { Flame, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const SOURCE_TYPES: Array<{ id: ContentSourceType; label: string; placeholder: string }> = [
  { id: "idea", label: "Idea", placeholder: "Describe the idea you want to turn into content…" },
  { id: "text", label: "Text", placeholder: "Paste a draft, message, or outline…" },
  { id: "product", label: "Product", placeholder: "Describe the product, audience, and key benefit…" },
];

/** Feature-flagged entry point that reuses the existing Creator Studio generation action. */
export function ContentGrowthStarter() {
  const [sourceType, setSourceType] = useState<ContentSourceType>("idea");
  const [input, setInput] = useState("");
  const [selectedTool, setSelectedTool] = useState("content-ideas");
  const { loading, error, result, phase, run, regenerate } = useCreatorGeneration();
  const recommendations = useMemo(() => contentRecommendations(sourceType), [sourceType]);
  const potential = useMemo(() => contentPotential(input), [input]);

  const activeSource = SOURCE_TYPES.find((source) => source.id === sourceType)!;

  return (
    <section className="saas-card rounded-2xl border border-accent/20 bg-accent/[0.03] p-4 sm:p-6" aria-labelledby="content-growth-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <Flame className="h-4 w-4" aria-hidden />
            Giga3 AI Content &amp; Growth Engine
          </p>
          <h2 id="content-growth-title" className="mt-2 text-xl font-bold text-foreground">
            Turn your ideas into content, audience &amp; income
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Start with an idea, draft, or product detail. Giga3 AI suggests a useful next step using your input only.
          </p>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm">
          <p className="text-xs font-medium text-muted">Content potential</p>
          <p className="text-lg font-bold text-foreground">{potential.score}/100</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Content input type">
        {SOURCE_TYPES.map((source) => (
          <button
            key={source.id}
            type="button"
            aria-pressed={sourceType === source.id}
            onClick={() => setSourceType(source.id)}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm font-medium",
              sourceType === source.id ? "border-accent/40 bg-accent/10 text-foreground" : "border-border bg-white text-muted"
            )}
          >
            {source.label}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="content-growth-input">
        What would you like to make?
      </label>
      <textarea
        id="content-growth-input"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={4}
        maxLength={4000}
        placeholder={activeSource.placeholder}
        className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm outline-none ring-accent/20 focus:ring-2"
      />
      <p className="mt-2 text-sm text-muted">{potential.advice}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {recommendations.map((recommendation) => (
          <button
            key={recommendation.toolId}
            type="button"
            onClick={() => setSelectedTool(recommendation.toolId)}
            className={cn(
              "rounded-xl border bg-white p-4 text-left",
              selectedTool === recommendation.toolId ? "border-accent/40 ring-2 ring-accent/10" : "border-border"
            )}
          >
            <span className="font-semibold text-foreground">{recommendation.title}</span>
            <span className="mt-1 block text-sm text-muted">{recommendation.detail}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          className="min-h-12"
          disabled={loading || !input.trim()}
          onClick={() => void run({ toolId: selectedTool, prompt: input, kind: "social" })}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {loading ? "Making something…" : "🔥 MAKE SOMETHING FROM THIS"}
        </Button>
        {phase === "success" && <p className="text-sm text-muted">Saved to your Creator Workspace.</p>}
      </div>

      <div className="mt-5">
        <CreatorResultPanel content={result} loading={loading} error={error} onRegenerate={() => void regenerate()} />
      </div>
    </section>
  );
}
