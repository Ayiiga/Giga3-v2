import { generationCoordinator } from "@/lib/generation/coordinator";
import type { AutomationWorkflow, WorkflowStep } from "./types";
import { saveWorkflowRun, type WorkflowRun } from "./workflows";

export type StepExecutor = {
  runChatStep: (prompt: string, mode?: string) => Promise<string>;
  runGigaLearnStep: (toolId: string, prompt: string) => Promise<string>;
  runCreatorStep: (toolId: string, prompt: string) => Promise<string>;
};

function applyTemplate(template: string, input: string, prior?: string): string {
  return template
    .replaceAll("{{input}}", input)
    .replaceAll("{{prior}}", prior ?? "");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWorkflow(
  workflow: AutomationWorkflow,
  input: string,
  executor: StepExecutor,
  options?: { signal?: AbortSignal }
): Promise<WorkflowRun> {
  const runId = `run_${Date.now()}`;
  const taskId = `automation:${runId}`;

  const run: WorkflowRun = {
    id: runId,
    workflowId: workflow.id,
    workflowTitle: workflow.title,
    status: "running",
    currentStep: 0,
    outputs: [],
    startedAt: Date.now(),
  };
  saveWorkflowRun(run);

  generationCoordinator.start({
    id: taskId,
    kind: "automation",
    label: workflow.title,
    state: "processing",
  });

  let priorOutput = "";
  try {
    for (let i = 0; i < workflow.steps.length; i++) {
      if (options?.signal?.aborted) {
        throw new Error("Workflow cancelled");
      }

      const step: WorkflowStep = workflow.steps[i];
      run.currentStep = i + 1;
      saveWorkflowRun(run);

      generationCoordinator.updateStage(
        taskId,
        `Step ${i + 1}/${workflow.steps.length}: ${step.label}`,
        Math.round(((i + 1) / workflow.steps.length) * 100)
      );

      const prompt = applyTemplate(
        step.promptTemplate,
        input,
        priorOutput || undefined
      );

      let output = "";
      switch (step.type) {
        case "chat":
          output = await executor.runChatStep(prompt, step.mode);
          break;
        case "gigalearn":
          if (!step.toolId) throw new Error("GigaLearn step missing toolId");
          output = await executor.runGigaLearnStep(step.toolId, prompt);
          break;
        case "creator":
          if (!step.toolId) throw new Error("Creator step missing toolId");
          output = await executor.runCreatorStep(step.toolId, prompt);
          break;
        case "notify":
          generationCoordinator.complete(taskId, {
            title: step.notifyMessage ?? step.label,
            body: priorOutput.slice(0, 120) || undefined,
            emoji: "🔔",
          });
          output = step.notifyMessage ?? "";
          break;
        case "delay":
          await delay(step.delayMs ?? 500);
          output = "";
          break;
        default:
          output = "";
      }

      if (output) {
        priorOutput = output;
        run.outputs.push(output);
        saveWorkflowRun(run);
      }
    }

    run.status = "completed";
    run.completedAt = Date.now();
    saveWorkflowRun(run);

    generationCoordinator.complete(taskId, {
      title: `${workflow.title} complete`,
      body: "Workflow finished successfully.",
      emoji: "✅",
    });

    return run;
  } catch (err) {
    run.status = options?.signal?.aborted ? "cancelled" : "failed";
    run.error = err instanceof Error ? err.message : "Workflow failed";
    run.completedAt = Date.now();
    saveWorkflowRun(run);

    generationCoordinator.fail(taskId, run.error);
    return run;
  }
}
