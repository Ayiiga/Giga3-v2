import type { ConnectorToolName } from "../connectors/toolPolicy";
import type { ExternalConnectorId } from "../connectors/types";

export type PlanStepStatus =
  | "pending"
  | "ready"
  | "awaiting_confirmation"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "blocked";

export type StoredPlanStep = {
  stepId: string;
  provider: ExternalConnectorId;
  operation: ConnectorToolName;
  title: string;
  params: Record<string, unknown>;
  requiresConfirmation: boolean;
  dependsOn: string[];
  status: PlanStepStatus;
  pendingActionId?: string;
  resultSummary?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
};

export type PlanReport = {
  ok: boolean;
  completedSteps: number;
  failedSteps: number;
  blockedSteps: number;
  awaitingConfirmation: number;
  lines: string[];
  generatedAt: number;
};
