"use client";

import { formatMediaError } from "@/lib/media/errors";
import { runWorkflow, type StepExecutor } from "@/lib/automation/orchestrator";
import {
  getWorkflow,
  listWorkflowRuns,
  listWorkflows,
  type WorkflowRun,
} from "@/lib/automation/workflows";
import type { AutomationWorkflow } from "@/lib/automation/types";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useMemo, useRef, useState } from "react";

export type AutomationPhase = "idle" | "running" | "success" | "error";

export function useAutomation() {
  const generateLearn = useAction(api.gigalearnStudio.generateContent);
  const generateCreator = useAction(api.creatorStudio.generateContent);
  const abortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<AutomationPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<WorkflowRun | null>(null);
  const [lastOutput, setLastOutput] = useState<string | null>(null);

  const workflows = useMemo(() => listWorkflows(), [phase, lastRun]);
  const runs = useMemo(() => listWorkflowRuns(), [phase, lastRun]);

  const buildExecutor = useCallback(
    (onChatInsert?: (text: string) => void): StepExecutor => ({
      runChatStep: async (prompt, _mode) => {
        if (onChatInsert) {
          onChatInsert(prompt);
          return prompt;
        }
        return prompt;
      },
      runGigaLearnStep: async (toolId, prompt) => {
        const sessionToken = getSessionToken();
        if (!sessionToken) throw new Error("Sign in required");
        const response = await generateLearn({
          sessionToken,
          toolId,
          prompt,
        });
        const content = response.content?.trim();
        if (!content) throw new Error("Empty GigaLearn response");
        return content;
      },
      runCreatorStep: async (toolId, prompt) => {
        const sessionToken = getSessionToken();
        if (!sessionToken) throw new Error("Sign in required");
        const response = await generateCreator({
          sessionToken,
          toolId,
          prompt,
        });
        const content = response.content?.trim();
        if (!content) throw new Error("Empty Creator response");
        return content;
      },
    }),
    [generateLearn, generateCreator]
  );

  const executeWorkflow = useCallback(
    async (
      workflow: AutomationWorkflow,
      input: string,
      onChatInsert?: (text: string) => void
    ) => {
      if (!input.trim() && workflow.steps.some((s) => s.promptTemplate.includes("{{input}}"))) {
        setError("Input is required for this workflow.");
        setPhase("error");
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setPhase("running");
      setError(null);
      setLastOutput(null);

      try {
        const run = await runWorkflow(
          workflow,
          input.trim(),
          buildExecutor(onChatInsert),
          { signal: controller.signal }
        );
        setLastRun(run);
        const output = run.outputs[run.outputs.length - 1] ?? null;
        setLastOutput(output);
        setPhase(run.status === "completed" ? "success" : "error");
        if (run.error) setError(run.error);
        return run;
      } catch (e) {
        const msg = formatMediaError(e);
        setError(msg);
        setPhase("error");
        return null;
      }
    },
    [buildExecutor]
  );

  const runById = useCallback(
    async (workflowId: string, input: string, onChatInsert?: (text: string) => void) => {
      const workflow = getWorkflow(workflowId);
      if (!workflow) {
        setError("Workflow not found");
        setPhase("error");
        return null;
      }
      return executeWorkflow(workflow, input, onChatInsert);
    },
    [executeWorkflow]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setLastOutput(null);
    setPhase("idle");
  }, []);

  return {
    workflows,
    runs,
    phase,
    loading: phase === "running",
    error,
    lastRun,
    lastOutput,
    executeWorkflow,
    runById,
    cancel,
    clear,
  };
}
