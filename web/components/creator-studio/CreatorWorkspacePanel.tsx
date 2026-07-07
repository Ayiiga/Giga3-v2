"use client";

import { Button } from "@/components/ui/Button";
import {
  listCreations,
  listPromptHistory,
  getUsageSnapshot,
  removeCreation,
  toggleCreationFavorite,
  type CreatorCreation,
} from "@/lib/creator-studio/workspace";
import { getCreatorTool } from "@/lib/creator-studio/tools";
import { cn } from "@/lib/utils";
import { Copy, Star, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

export const CreatorWorkspacePanel = memo(function CreatorWorkspacePanel({
  onReusePrompt,
}: {
  onReusePrompt?: (prompt: string, toolId: string) => void;
}) {
  const [creations, setCreations] = useState<CreatorCreation[]>([]);
  const [prompts, setPrompts] = useState(() => listPromptHistory());
  const [usage, setUsage] = useState(() => getUsageSnapshot());
  const [filter, setFilter] = useState<"all" | "favorites" | "writing" | "social" | "image">(
    "all"
  );

  const refresh = useCallback(() => {
    setCreations(listCreations());
    setPrompts(listPromptHistory());
    setUsage(getUsageSnapshot());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = creations.filter((c) => {
    if (filter === "favorites") return c.favorite;
    if (filter === "all") return true;
    return c.kind === filter;
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total creations" value={String(usage.totalGenerations)} />
        <StatCard label="Today" value={String(usage.dailyCounts[new Date().toISOString().slice(0, 10)] ?? 0)} />
        <StatCard label="Est. credits used" value={String(usage.creditsConsumedEstimate)} />
        <StatCard label="Daily limit" value={`${usage.dailyLimit} (local)`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "favorites", "writing", "social", "image"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
              filter === id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border text-muted"
            )}
          >
            {id}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="saas-card rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No saved creations yet. Generate writing, social, or image content to build your workspace.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id} className="saas-card rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                    {item.favorite && (
                      <Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(item.createdAt).toLocaleString()} · {item.kind}
                    {item.platform ? ` · ${item.platform}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(item.content);
                    }}
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      toggleCreationFavorite(item.id);
                      refresh();
                    }}
                  >
                    <Star className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeCreation(item.id);
                      refresh();
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
              {item.outputUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.outputUrl}
                  alt=""
                  className="mt-3 max-h-48 rounded-xl border border-border object-contain"
                />
              ) : (
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-foreground">
                  {item.content}
                </p>
              )}
              {onReusePrompt && (
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-accent hover:underline"
                  onClick={() => onReusePrompt(item.prompt, item.toolId)}
                >
                  Reuse prompt in {getCreatorTool(item.toolId)?.label ?? "tool"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {prompts.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Prompt history</h3>
          <ul className="space-y-2">
            {prompts.slice(0, 8).map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-muted"
              >
                <span className="font-medium text-foreground">
                  {getCreatorTool(p.toolId)?.label ?? p.toolId}
                </span>
                <p className="mt-1 line-clamp-2">{p.prompt}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="saas-card rounded-2xl border border-border px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
