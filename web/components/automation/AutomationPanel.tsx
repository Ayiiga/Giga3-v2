"use client";

import { Button } from "@/components/ui/Button";
import { AI_AGENTS } from "@/lib/automation/agents";
import { getActiveIntegrations } from "@/lib/automation/integrations";
import { useAutomation } from "@/hooks/useAutomation";
import { cn } from "@/lib/utils";
import { Bot, Play, Workflow, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type AutomationPanelProps = {
  embedded?: boolean;
  onInsertChat?: (text: string) => void;
  disabled?: boolean;
};

export function AutomationPanel({
  embedded = false,
  onInsertChat,
  disabled,
}: AutomationPanelProps) {
  const { workflows, loading, error, lastOutput, runById } = useAutomation();
  const [selectedId, setSelectedId] = useState(workflows[0]?.id ?? "");
  const [input, setInput] = useState("");

  const selected = workflows.find((w) => w.id === selectedId);

  return (
    <div className={cn("space-y-4", embedded ? "p-3 sm:p-4" : "p-6")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Workflow className="h-4 w-4 text-violet-600" aria-hidden />
            AI workflows
          </h2>
          <p className="mt-1 text-xs text-muted">
            Reusable automations — uses existing GigaLearn &amp; Creator AI.
          </p>
        </div>
        <Link
          href="/automation"
          className="text-xs text-accent hover:underline"
        >
          Open hub
        </Link>
      </div>

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        disabled={disabled || loading}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
      >
        {workflows.map((w) => (
          <option key={w.id} value={w.id}>
            {w.title}
          </option>
        ))}
      </select>

      {selected && (
        <p className="text-xs text-muted">{selected.description}</p>
      )}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={disabled || loading}
        placeholder="Paste text, syllabus, or topic…"
        rows={embedded ? 3 : 4}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
      />

      <Button
        type="button"
        size="sm"
        disabled={disabled || loading || !selectedId}
        onClick={() => void runById(selectedId, input, onInsertChat)}
        className="w-full"
      >
        <Play className="mr-1 h-4 w-4" aria-hidden />
        {loading ? "Running…" : "Run workflow"}
      </Button>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      )}

      {lastOutput && (
        <div className="rounded-lg border border-border bg-card p-3 text-xs">
          <p className="mb-1 font-medium text-muted">Last output</p>
          <p className="max-h-32 overflow-y-auto whitespace-pre-wrap">{lastOutput}</p>
        </div>
      )}

      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-medium text-muted">Quick agents</p>
        <div className="flex flex-wrap gap-1.5">
          {AI_AGENTS.slice(0, 4).map((agent) => (
            <Link
              key={agent.id}
              href={`/automation?agent=${agent.id}`}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs hover:border-accent/30"
            >
              <Bot className="h-3 w-3" aria-hidden />
              {agent.label.split(" ")[0]}
            </Link>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-1 text-xs text-muted">
        <Zap className="h-3 w-3" aria-hidden />
        {getActiveIntegrations().length} platform integrations active
      </p>
    </div>
  );
}
