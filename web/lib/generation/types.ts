export type GenerationKind =
  | "chat"
  | "image"
  | "video"
  | "document"
  | "code"
  | "analysis"
  | "audio";

export type GenerationState =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type GenerationToast = {
  id: string;
  title: string;
  body?: string;
  emoji?: string;
  kind: GenerationKind;
  createdAt: number;
};

export type GenerationTask = {
  id: string;
  kind: GenerationKind;
  label: string;
  state: GenerationState;
  stage?: string;
  /** Optional 0–100 estimate for progress bars. */
  progress?: number;
  startedAt: number;
  completedAt?: number;
  notified?: boolean;
};

export const CHAT_REPLY_INCOMPLETE_ERROR =
  "AI could not complete this reply. Your message was saved — please try again.";

export const CHAT_REPLY_TIMEOUT_ERROR =
  "Reply is taking longer than expected. Your message was saved — please try again or check your connection.";
