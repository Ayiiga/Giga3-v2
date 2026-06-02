export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResult {
  content: string;
  provider: string;
  model: string;
}

/** Pluggable AI backend (OpenAI today; Anthropic, etc. later). */
export interface AiProvider {
  readonly id: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
