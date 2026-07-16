"use client";

import { CreditPromptLinks } from "@/components/billing/CreditPromptLinks";
import { CreatorResultPanel } from "@/components/creator-studio/CreatorResultPanel";
import { Button } from "@/components/ui/Button";
import { useCreatorGeneration } from "@/hooks/useCreatorGeneration";
import type { CreatorToolDefinition } from "@/lib/creator-studio/tools";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import { memo, useState } from "react";

interface CreatorTextToolPanelProps {
  tools: CreatorToolDefinition[];
  kind: "writing" | "social";
  credits: number | null;
  platform?: string;
  platformOptions?: Array<{ id: string; label: string; emoji: string }>;
}

export const CreatorTextToolPanel = memo(function CreatorTextToolPanel({
  tools,
  kind,
  credits,
  platform: fixedPlatform,
  platformOptions,
}: CreatorTextToolPanelProps) {
  const { phase, loading, error, result, run, regenerate, clear } = useCreatorGeneration();
  const [activeToolId, setActiveToolId] = useState(tools[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [platform, setPlatform] = useState(platformOptions?.[0]?.id ?? fixedPlatform ?? "");

  const activeTool = tools.find((t) => t.id === activeToolId) ?? tools[0];
  const insufficientCredits = credits != null && credits < (activeTool?.creditCost ?? 2);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="creator-tool-grid">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const selected = tool.id === activeToolId;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveToolId(tool.id);
                  clear();
                }}
                className={cn(
                  "creator-tool-card saas-card flex min-h-11 items-start gap-3 rounded-xl border px-3 py-3 text-left",
                  selected
                    ? "border-accent/40 bg-accent/5"
                    : "border-border hover:border-accent/25"
                )}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="block text-sm font-medium text-foreground">{tool.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{tool.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        {platformOptions && platformOptions.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">Platform</label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={cn(
                    "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium",
                    platform === p.id
                      ? "border-accent/40 bg-accent/10 text-foreground"
                      : "border-border text-muted hover:border-accent/25"
                  )}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor={`creator-prompt-${kind}`} className="mb-2 block text-sm font-medium text-muted">
            Your prompt
          </label>
          <textarea
            id={`creator-prompt-${kind}`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder={activeTool?.placeholder}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
          />
        </div>

        {kind === "social" && (
          <div>
            <label htmlFor="creator-context" className="mb-2 block text-sm font-medium text-muted">
              Extra context (optional)
            </label>
            <input
              id="creator-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Brand voice, audience, language…"
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={loading || insufficientCredits || !prompt.trim()}
            onClick={() =>
              void run({
                toolId: activeToolId,
                prompt,
                platform: platform as import("@/lib/creator-studio/tools").SocialPlatformId,
                context,
                kind,
              })
            }
            className="min-h-11"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            Generate
          </Button>
          {insufficientCredits && (
            <CreditPromptLinks
              creditCost={activeTool?.creditCost ?? 2}
              className="text-xs text-amber-700"
            />
          )}
          {phase === "success" && (
            <p className="text-xs text-muted">Saved to your Creator Workspace.</p>
          )}
        </div>
      </div>

      <CreatorResultPanel
        content={result}
        loading={loading}
        error={error}
        onRegenerate={() => void regenerate()}
      />
    </div>
  );
});
