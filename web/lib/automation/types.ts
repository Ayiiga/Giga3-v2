import type { AiModeId } from "@/lib/aiRouter";

export type WorkflowStepType =
  | "chat"
  | "gigalearn"
  | "creator"
  | "notify"
  | "delay";

export type WorkflowStep = {
  id: string;
  type: WorkflowStepType;
  label: string;
  /** Chat mode when type is chat */
  mode?: AiModeId;
  /** GigaLearn / Creator tool id */
  toolId?: string;
  /** Prompt template; {{input}} replaced with prior step output or user input */
  promptTemplate: string;
  /** Delay ms when type is delay */
  delayMs?: number;
  notifyMessage?: string;
};

export type AutomationWorkflow = {
  id: string;
  title: string;
  description: string;
  category: "education" | "creator" | "business" | "general";
  steps: WorkflowStep[];
  builtIn?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type WorkflowRunStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type WorkflowRunRecord = {
  id: string;
  workflowId: string;
  workflowTitle: string;
  status: WorkflowRunStatus;
  currentStep: number;
  outputs: string[];
  error?: string;
  startedAt: number;
  completedAt?: number;
};

export type AgentId =
  | "study"
  | "teacher"
  | "business"
  | "marketing"
  | "writing"
  | "coding"
  | "research"
  | "creator";

export type AgentDefinition = {
  id: AgentId;
  label: string;
  description: string;
  mode: AiModeId;
  systemHint: string;
  suggestedWorkflowIds: string[];
  gigalearnTab?: string;
  creatorLink?: string;
};

export type IntegrationId =
  | "giga3_chat"
  | "giga3_media"
  | "giga3_gigalearn"
  | "giga3_marketplace"
  | "google_drive"
  | "outlook_calendar"
  | "gmail"
  | "zoom"
  | "moodle"
  | "notion";

export type IntegrationAdapter = {
  id: IntegrationId;
  label: string;
  category: string;
  available: boolean;
  description: string;
  href?: string;
};

export type AutomationNotificationKey =
  | "study_sessions"
  | "assignment_deadlines"
  | "creator_tasks"
  | "marketplace_updates"
  | "subscription_reminders"
  | "learning_goals";

export type AutomationNotificationPrefs = Record<
  AutomationNotificationKey,
  boolean
>;

export type SearchResultKind =
  | "chat_prompt"
  | "workflow"
  | "learning_artifact"
  | "creator_artifact"
  | "conversation"
  | "community";

export type PlatformSearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  snippet: string;
  href?: string;
  score: number;
  createdAt?: number;
};
