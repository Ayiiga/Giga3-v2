"use client";

import { PlatformSearchPanel } from "@/components/automation/PlatformSearchPanel";
import { AutomationNotificationsPanel } from "@/components/automation/AutomationNotificationsPanel";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { AI_AGENTS, getAgent } from "@/lib/automation/agents";
import { getActiveIntegrations, INTEGRATION_ADAPTERS } from "@/lib/automation/integrations";
import { useAutomation } from "@/hooks/useAutomation";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  Bot,
  Plug,
  Search,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Tab = "workflows" | "agents" | "integrations" | "search" | "notifications";

function AutomationPageInner() {
  const params = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "workflows";
  const [tab, setTab] = useState<Tab>(
    ["workflows", "agents", "integrations", "search", "notifications"].includes(initialTab)
      ? initialTab
      : "workflows"
  );

  const agentId = params.get("agent");
  const workflowId = params.get("workflow");
  const agent = agentId ? getAgent(agentId) : null;

  const {
    workflows,
    runs,
    loading,
    error,
    lastOutput,
    runById,
    executeWorkflow,
    clear,
  } = useAutomation();

  const [selectedId, setSelectedId] = useState(workflowId ?? workflows[0]?.id ?? "");
  const [input, setInput] = useState("");

  useEffect(() => {
    if (workflowId) setSelectedId(workflowId);
  }, [workflowId]);

  useEffect(() => {
    if (agent?.suggestedWorkflowIds[0]) {
      setSelectedId(agent.suggestedWorkflowIds[0]);
    }
  }, [agent]);

  const selected = workflows.find((w) => w.id === selectedId);

  const tabs: Array<{ id: Tab; label: string; icon: typeof Workflow }> = [
    { id: "workflows", label: "Workflows", icon: Workflow },
    { id: "agents", label: "Agents", icon: Bot },
    { id: "integrations", label: "Integrations", icon: Plug },
    { id: "search", label: "Search", icon: Search },
    { id: "notifications", label: "Alerts", icon: Zap },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-700">
          <Zap className="h-4 w-4" aria-hidden />
          Automation &amp; workflows
        </div>
        <h1 className="page-title">Intelligent workflows</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Automate repetitive tasks with reusable AI workflows, specialized agents,
          and a secure integration layer — built on existing Giga3 infrastructure.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium",
                tab === t.id
                  ? "border-b-2 border-violet-500 text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "workflows" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-border p-5">
            <h2 className="font-semibold">Run workflow</h2>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                  {w.builtIn ? " (built-in)" : ""}
                </option>
              ))}
            </select>
            {selected && (
              <p className="text-sm text-muted">{selected.description}</p>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Input text, syllabus, notes, or topic…"
              rows={5}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={loading || !selected}
                onClick={() =>
                  selected && void executeWorkflow(selected, input)
                }
              >
                {loading ? "Running…" : "Run workflow"}
              </Button>
              <Button type="button" variant="ghost" onClick={clear}>
                Clear
              </Button>
            </div>
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            {lastOutput && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm">
                <p className="mb-2 font-medium">Output</p>
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs">
                  {lastOutput}
                </pre>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border p-5">
            <h2 className="font-semibold">Recent runs</h2>
            {runs.length === 0 ? (
              <p className="text-sm text-muted">No workflow runs yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {runs.slice(0, 8).map((run) => (
                  <li
                    key={run.id}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    <span className="font-medium">{run.workflowTitle}</span>
                    <span className="ml-2 capitalize text-muted">{run.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={siteConfig.links.gigalearn} className="text-sm text-accent hover:underline">
              View GigaLearn artifacts →
            </Link>
          </section>
        </div>
      )}

      {tab === "agents" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {AI_AGENTS.map((a) => (
            <article
              key={a.id}
              className={cn(
                "rounded-2xl border border-border p-5",
                agentId === a.id && "border-violet-500/40 bg-violet-500/5"
              )}
            >
              <h3 className="font-semibold">{a.label}</h3>
              <p className="mt-1 text-sm text-muted">{a.description}</p>
              <p className="mt-2 text-xs text-muted">Mode: {a.mode}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {a.gigalearnTab && (
                  <Link
                    href={`${siteConfig.links.gigalearn}?tab=${a.gigalearnTab}`}
                    className="text-xs text-accent hover:underline"
                  >
                    Open GigaLearn
                  </Link>
                )}
                {a.creatorLink && (
                  <Link href={a.creatorLink} className="text-xs text-accent hover:underline">
                    Creator Studio
                  </Link>
                )}
                <button
                  type="button"
                  className="text-xs text-accent hover:underline"
                  onClick={() => {
                    if (a.suggestedWorkflowIds[0]) {
                      setSelectedId(a.suggestedWorkflowIds[0]);
                      setTab("workflows");
                    }
                  }}
                >
                  Run suggested workflow
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "integrations" && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {getActiveIntegrations().length} active ·{" "}
            {INTEGRATION_ADAPTERS.length - getActiveIntegrations().length} planned
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {INTEGRATION_ADAPTERS.map((adapter) => (
              <article
                key={adapter.id}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  adapter.available
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border text-muted"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{adapter.label}</span>
                  <span className="text-xs">
                    {adapter.available ? "Active" : "Planned"}
                  </span>
                </div>
                <p className="mt-1 text-xs">{adapter.description}</p>
                {adapter.href && (
                  <Link href={adapter.href} className="mt-2 inline-block text-xs text-accent hover:underline">
                    Open →
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "search" && <PlatformSearchPanel />}

      {tab === "notifications" && <AutomationNotificationsPanel />}
    </div>
  );
}

export function AutomationPageClient() {
  return (
    <ConvexAppShell>
      <Suspense fallback={<LoadingState label="Loading automation…" className="py-16" />}>
        <AutomationPageInner />
      </Suspense>
    </ConvexAppShell>
  );
}
