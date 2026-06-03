import OpenAI from "openai";

export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatEngineResult = {
  content: string;
  providerId: string;
  /** True if not the primary OpenAI model path */
  usedFallback: boolean;
};

const PROVIDER_LABELS: Record<string, string> = {
  openai_primary: "Primary AI",
  openai_fallback_model: "Backup model",
  openai_retry: "Compact retry",
  openai_secondary_key: "Secondary API key",
  local_fallback: "Service notice",
};

export function getChatProviderLabel(providerId: string): string {
  return PROVIDER_LABELS[providerId] ?? providerId;
}

async function openaiComplete(
  apiKey: string,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });
  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Empty response from OpenAI");
  }
  return text;
}

function trimHistoryForRetry(
  messages: ChatCompletionMessage[],
  maxTurns: number
): ChatCompletionMessage[] {
  const system = messages.filter((m) => m.role === "system");
  const dialogue = messages.filter((m) => m.role !== "system");
  return [...system, ...dialogue.slice(-maxTurns)];
}

/**
 * Tries multiple chat backends in order until one succeeds.
 * Primary → backup model → compact retry → optional second API key → local notice.
 */
export async function completeChatWithFailover(
  messages: ChatCompletionMessage[]
): Promise<ChatEngineResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const primaryModel = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const fallbackModel = process.env.OPENAI_FALLBACK_MODEL ?? "gpt-3.5-turbo";
  const secondaryKey = process.env.OPENAI_FALLBACK_API_KEY?.trim();

  const asOpenAi = messages as OpenAI.Chat.ChatCompletionMessageParam[];

  type Attempt = { id: string; run: () => Promise<string> };
  const attempts: Attempt[] = [];

  if (apiKey) {
    attempts.push({
      id: "openai_primary",
      run: () => openaiComplete(apiKey, primaryModel, asOpenAi),
    });

    if (fallbackModel !== primaryModel) {
      attempts.push({
        id: "openai_fallback_model",
        run: () => openaiComplete(apiKey, fallbackModel, asOpenAi),
      });
    }

    attempts.push({
      id: "openai_retry",
      run: () =>
        openaiComplete(
          apiKey,
          primaryModel,
          trimHistoryForRetry(messages, 14) as OpenAI.Chat.ChatCompletionMessageParam[]
        ),
    });
  }

  if (secondaryKey && secondaryKey !== apiKey) {
    attempts.push({
      id: "openai_secondary_key",
      run: () => openaiComplete(secondaryKey, fallbackModel, asOpenAi),
    });
  }

  const failures: string[] = [];

  for (const attempt of attempts) {
    try {
      const content = await attempt.run();
      return {
        content,
        providerId: attempt.id,
        usedFallback: attempt.id !== "openai_primary",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${attempt.id}: ${msg}`);
      console.error(`[chatEngine] ${attempt.id} failed:`, msg);
    }
  }

  const detail =
    failures.length > 0
      ? failures[failures.length - 1]
      : "OPENAI_API_KEY is not configured in Convex";

  return {
    content:
      "I'm having trouble reaching our AI services right now. Your message was saved. " +
      "Please try again in a moment.\n\n" +
      `(Technical: ${detail})`,
    providerId: "local_fallback",
    usedFallback: true,
  };
}
