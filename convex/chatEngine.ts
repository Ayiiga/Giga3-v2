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
  openai_primary: "Primary AI (OpenAI)",
  openai_fallback_model: "Backup model (OpenAI)",
  openai_retry: "Compact retry (OpenAI)",
  openai_secondary_key: "Secondary API key (OpenAI)",
  gemini: "Google Gemini",
  fal_ai: "fal.ai",
  local_fallback: "Service notice",
};

export function getChatProviderLabel(providerId: string): string {
  return PROVIDER_LABELS[providerId] ?? providerId;
}

function getFalApiKey(): string | undefined {
  return (
    process.env.FAL_KEY?.trim() ||
    process.env.FAL_API_KEY?.trim() ||
    undefined
  );
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

async function geminiComplete(
  apiKey: string,
  model: string,
  messages: ChatCompletionMessage[]
): Promise<string> {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

  if (contents.length === 0) {
    throw new Error("No user/assistant messages for Gemini");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
}

/** fal.ai OpenRouter-compatible chat (OpenAI message shape). */
async function falComplete(
  falKey: string,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  const res = await fetch(
    "https://fal.run/openrouter/router/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`fal.ai HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    output?: string;
  };

  const fromChoices = data.choices?.[0]?.message?.content?.trim();
  if (fromChoices) return fromChoices;

  if (typeof data.output === "string" && data.output.trim()) {
    return data.output.trim();
  }

  throw new Error("Empty response from fal.ai");
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
 * OpenAI paths → Gemini → fal.ai → local notice.
 */
export async function completeChatWithFailover(
  messages: ChatCompletionMessage[]
): Promise<ChatEngineResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const primaryModel = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const fallbackModel = process.env.OPENAI_FALLBACK_MODEL ?? "gpt-3.5-turbo";
  const secondaryKey = process.env.OPENAI_FALLBACK_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const falKey = getFalApiKey();
  const falModel =
    process.env.FAL_MODEL ?? process.env.FAL_LLM_MODEL ?? "google/gemini-2.5-flash";

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

  if (geminiKey) {
    attempts.push({
      id: "gemini",
      run: () => geminiComplete(geminiKey, geminiModel, messages),
    });
  }

  if (falKey) {
    attempts.push({
      id: "fal_ai",
      run: () => falComplete(falKey, falModel, asOpenAi),
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
      : "No AI provider configured (set OPENAI_API_KEY, GEMINI_API_KEY, and/or FAL_KEY on Convex)";

  return {
    content:
      "I'm having trouble reaching our AI services right now. Your message was saved. " +
      "Please try again in a moment.\n\n" +
      `(Technical: ${detail})`,
    providerId: "local_fallback",
    usedFallback: true,
  };
}
