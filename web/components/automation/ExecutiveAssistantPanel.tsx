"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { getSessionToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useCallback, useState } from "react";

type StepView = {
  stepId: string;
  provider: string;
  operation: string;
  title: string;
  status: string;
  requiresConfirmation: boolean;
  pendingActionId?: string;
  resultSummary?: string;
  error?: string;
};

export function ExecutiveAssistantPanel() {
  const sessionToken = getSessionToken() ?? undefined;
  const createPlan = useAction(api.assistantOrchestrator.engine.createPlan);
  const advancePlan = useAction(api.assistantOrchestrator.engine.advancePlan);
  const cancelPlan = useMutation(api.assistantOrchestrator.store.cancelPlan);
  const recent = useQuery(
    api.assistantOrchestrator.store.listRecentPlans,
    sessionToken ? { sessionToken } : "skip"
  );

  const [request, setRequest] = useState("");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const activePlan = useQuery(
    api.assistantOrchestrator.store.getPlan,
    sessionToken && activePlanId
      ? { sessionToken, planId: activePlanId as never }
      : "skip"
  );

  const handlePlan = useCallback(async () => {
    if (!sessionToken) {
      setError("Sign in to use the executive assistant.");
      return;
    }
    if (!request.trim()) {
      setError("Describe the outcome you want.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const plan = await createPlan({ sessionToken, request: request.trim() });
      setActivePlanId(plan.planId);
      setSummary(plan.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create plan.");
    } finally {
      setBusy(false);
    }
  }, [createPlan, request, sessionToken]);

  const handleAdvance = useCallback(
    async (confirmStepId?: string, pendingActionId?: string) => {
      if (!sessionToken || !activePlanId) return;
      setBusy(true);
      setError(null);
      try {
        const result = await advancePlan({
          sessionToken,
          planId: activePlanId as never,
          confirmStepId,
          pendingActionId,
        });
        if (result.report?.lines) {
          setSummary(result.report.lines.join("\n"));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Execution failed.");
      } finally {
        setBusy(false);
      }
    },
    [activePlanId, advancePlan, sessionToken]
  );

  const handleCancel = useCallback(async () => {
    if (!sessionToken || !activePlanId) return;
    setBusy(true);
    try {
      await cancelPlan({ sessionToken, planId: activePlanId as never });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }, [activePlanId, cancelPlan, sessionToken]);

  if (!sessionToken) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
        Sign in to plan and run connector tasks.{" "}
        <Link href="/chat/login/" className="text-accent underline">
          Sign in
        </Link>
      </p>
    );
  }

  const steps = (activePlan?.steps ?? []) as StepView[];

  return (
    <div className="space-y-4">
      <div className="saas-card space-y-3 rounded-2xl border border-border p-4">
        <h2 className="text-base font-semibold text-foreground">Executive Assistant</h2>
        <p className="text-sm text-muted">
          Describe a goal across Gmail, Drive, Outlook, Zoom, Moodle, or Notion. Giga3 builds a
          plan, checks your connections, asks before consequential actions, and reports only
          verified results.
        </p>
        <textarea
          className="min-h-[6rem] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
          placeholder='Example: "Create a Zoom meeting about BECE revision and email the link to teacher@school.edu"'
          value={request}
          onChange={(e) => setRequest(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void handlePlan()}>
            Create plan
          </Button>
          {activePlanId ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void handleAdvance()}
              >
                Run / continue
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void handleCancel()}
              >
                Cancel plan
              </Button>
            </>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      {busy && !activePlan ? <LoadingState label="Working…" /> : null}

      {activePlan ? (
        <section className="saas-card space-y-3 rounded-2xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Plan</h3>
              <p className="text-xs text-muted">
                Status: {activePlan.status} · Intent: {activePlan.intent}
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground">{activePlan.goal}</p>
          {activePlan.missingHints?.length ? (
            <ul className="space-y-1 text-xs text-amber-800">
              {activePlan.missingHints.map((h: string) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : null}
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li
                key={step.stepId}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  step.status === "completed" && "border-emerald-500/30 bg-emerald-500/5",
                  step.status === "failed" && "border-red-500/30 bg-red-500/5",
                  step.status === "awaiting_confirmation" &&
                    "border-amber-500/40 bg-amber-500/10",
                  step.status === "blocked" && "border-border opacity-70"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {index + 1}. {step.title}
                  </span>
                  <span className="text-xs text-muted">{step.status}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">
                  {step.provider}/{step.operation}
                  {step.requiresConfirmation ? " · confirmation required" : ""}
                </p>
                {step.error ? <p className="mt-1 text-xs text-red-600">{step.error}</p> : null}
                {step.resultSummary ? (
                  <p className="mt-1 break-words text-xs text-muted">{step.resultSummary}</p>
                ) : null}
                {step.status === "awaiting_confirmation" ? (
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    disabled={busy}
                    onClick={() =>
                      void handleAdvance(step.stepId, step.pendingActionId)
                    }
                  >
                    Confirm and run
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
          {activePlan.report?.lines?.length ? (
            <pre className="overflow-x-auto rounded-xl bg-muted/20 p-3 text-xs whitespace-pre-wrap">
              {activePlan.report.lines.join("\n")}
            </pre>
          ) : summary ? (
            <pre className="overflow-x-auto rounded-xl bg-muted/20 p-3 text-xs whitespace-pre-wrap">
              {summary}
            </pre>
          ) : null}
          <p className="text-[11px] text-muted">
            Connect missing services in{" "}
            <button
              type="button"
              className="text-accent underline"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "integrations");
                window.location.href = url.toString();
              }}
            >
              Integrations
            </button>
            . Results are never invented — only what connectors actually return.
          </p>
        </section>
      ) : null}

      {recent && recent.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Recent plans</h3>
          <ul className="space-y-1">
            {recent.map((p) => (
              <li key={p.planId}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-xs hover:bg-muted/10"
                  onClick={() => setActivePlanId(p.planId)}
                >
                  <span className="font-medium">{p.status}</span> · {p.goal.slice(0, 80)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
