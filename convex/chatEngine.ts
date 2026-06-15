
import OpenAI from "openai";
import { falOpenRouterChatComplete, getFalApiKey } from "./falClient";

export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  attachments?: ChatCompletionAttachment[];
};

export type ChatCompletionAttachment = {
  kind: "image" | "document" | "archive" | "spreadsheet" | "presentation" | "pdf" | "text";
  name: string;
  mimeType?: string;
  sizeBytes: number;
  text?: string;
  dataUrl?: string;
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
  openai_secondary_key: "Secondary API key (OpenAI)",
  gemini: "Google Gemini",
  fal_ai: "fal.ai (OpenRouter)",
  local_fallback: "Service notice",
};

export function getChatProviderLabel(providerId: string): string {
  return PROVIDER_LABELS[providerId] ?? providerId;
}

/** Gemini REST expects `gemini-2.5-flash`, not `models/...` or image-model ids. */
export function normalizeGeminiChatModel(raw: string): string {
  let model = raw.trim();
  if (!model) return "gemini-2.5-flash";
  if (model.startsWith("models/")) {
    model = model.slice("models/".length);
  }
  if (model.includes("/")) {
    model = model.split("/").pop() ?? model;
  }
  if (/imagen|flash-image|image-preview/i.test(model)) {
    return "gemini-2.5-flash";
  }
  return model;
}

function chatConfig() {
  return {
    providerTimeoutMs: Number(process.env.CHAT_PROVIDER_TIMEOUT_MS) || 22_000,
    maxTokens: Number(process.env.CHAT_MAX_TOKENS) || 1024,
    maxDialogueMessages: Number(process.env.CHAT_MAX_HISTORY_TURNS) || 12,
    enableFalChat: process.env.CHAT_ENABLE_FAL !== "false",
    falTimeoutMs: Number(process.env.CHAT_FAL_TIMEOUT_MS) || 12_000,
  };
}

/** Limits context size — critical on high-latency / metered networks. */
export function trimChatMessages(
  messages: ChatCompletionMessage[],
  maxDialogueMessages = 12
): ChatCompletionMessage[] {
  const system = messages.filter((m) => m.role === "system");
  const dialogue = messages.filter((m) => m.role !== "system");
  const maxChars = Number(process.env.CHAT_MAX_INPUT_CHARS) || 24_000;
  let trimmed = dialogue.slice(-maxDialogueMessages);
  while (
    trimmed.length > 2 &&
    trimmed.reduce((n, m) => n + m.content.length + attachmentTextLength(m), 0) >
      maxChars
  ) {
    trimmed = trimmed.slice(1);
  }
  return [...system, ...trimmed];
}

function attachmentTextLength(message: ChatCompletionMessage): number {
  return (message.attachments ?? []).reduce(
    (sum, attachment) => sum + (attachment.text?.length ?? 0),
    0
  );
}

function attachmentSummary(attachment: ChatCompletionAttachment): string {
  const type = attachment.mimeType ? `, type ${attachment.mimeType}` : "";
  return `${attachment.name} (${attachment.kind}, ${attachment.sizeBytes} bytes${type})`;
}

function textForFallback(message: ChatCompletionMessage): string {
  const attachments = message.attachments ?? [];
  if (!attachments.length) return message.content;
  const blocks = attachments.map((attachment, index) => {
    const header = `Attachment ${index + 1}: ${attachmentSummary(attachment)}`;
    const body = attachment.text?.trim()
      ? attachment.text.trim()
      : attachment.dataUrl
        ? "[Image data attached for vision-capable providers]"
        : "[No extracted text available]";
    return `${header}\n${body}`;
  });
  return `${message.content}\n\n--- Uploaded context ---\n${blocks.join("\n\n")}\n--- End uploaded context ---`;
}

function dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function toOpenAiMessages(
  messages: ChatCompletionMessage[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((message) => {
    const imageParts = (message.attachments ?? [])
      .filter((attachment) => attachment.kind === "image" && attachment.dataUrl)
      .map((attachment) => ({
        type: "image_url" as const,
        image_url: { url: attachment.dataUrl as string, detail: "auto" as const },
      }));

    const text = textForFallback(message);
    if (message.role === "user" && imageParts.length > 0) {
      return {
        role: "user",
        content: [{ type: "text" as const, text }, ...imageParts],
      };
    }

    return {
      role: message.role,
      content: text,
    } as OpenAI.Chat.ChatCompletionMessageParam;
  });
}

function toTextOnlyMessages(messages: ChatCompletionMessage[]): ChatCompletionMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: textForFallback(message),
  }));
}

async function withProviderTimeout<T>(
  label: string,
  ms: number,
  run: () => Promise<T>
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function openaiComplete(
  apiKey: string,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  timeoutMs: number,
  maxTokens: number
): Promise<string> {
  const client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 });
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
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
  messages: ChatCompletionMessage[],
  timeoutMs: number,
  maxTokens: number
): Promise<string> {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const parts: Array<
        | { text: string }
        | { inline_data: { mime_type: string; data: string } }
      > = [{ text: textForFallback(m) }];

      for (const attachment of m.attachments ?? []) {
        if (attachment.kind !== "image" || !attachment.dataUrl) continue;
        const inline = dataUrlToInlineData(attachment.dataUrl);
        if (!inline) continue;
        parts.push({
          inline_data: {
            mime_type: inline.mimeType,
            data: inline.data,
          },
        });
      }

      return {
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts,
      };
    });

  if (contents.length === 0) {
    throw new Error("No user/assistant messages for Gemini");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
    },
  };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Gemini timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

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

type Attempt = { id: string; run: () => Promise<string> };

async function raceFirstSuccess(
  attempts: Attempt[],
  timeoutMs: number
): Promise<ChatEngineResult | null> {
  if (attempts.length === 0) return null;

  return new Promise((resolve) => {
    let settled = false;
    let failures = 0;

    const finishFailure = (id: string, err: unknown) => {
      if (settled) return;
      failures += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[chatEngine] ${id} failed:`, msg);
      if (failures >= attempts.length) {
        settled = true;
        resolve(null);
      }
    };

    for (const attempt of attempts) {
      void withProviderTimeout(attempt.id, timeoutMs, attempt.run)
        .then((content) => {
          if (settled) return;
          settled = true;
          resolve({
            content,
            providerId: attempt.id,
            usedFallback: attempt.id !== "openai_primary",
          });
        })
        .catch((err) => finishFailure(attempt.id, err));
    }
  });
}

async function runSequential(
  attempts: Attempt[],
  timeoutMs: number
): Promise<ChatEngineResult | null> {
  for (const attempt of attempts) {
    try {
      const content = await withProviderTimeout(
        attempt.id,
        timeoutMs,
        attempt.run
      );
      return {
        content,
        providerId: attempt.id,
        usedFallback: attempt.id !== "openai_primary",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[chatEngine] ${attempt.id} failed:`, msg);
    }
  }
  return null;
}

export async function completeChatWithFailover(
  messages: ChatCompletionMessage[]
): Promise<ChatEngineResult> {
  const cfg = chatConfig();
  const trimmed = trimChatMessages(messages, cfg.maxDialogueMessages);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const primaryModel = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const fallbackModel = process.env.OPENAI_FALLBACK_MODEL ?? "gpt-3.5-turbo";
  const secondaryKey = process.env.OPENAI_FALLBACK_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel = normalizeGeminiChatModel(
    process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
  );
  const falKey = getFalApiKey();
  const falModel =
    process.env.FAL_MODEL ?? process.env.FAL_LLM_MODEL ?? "google/gemini-2.0-flash";

  const asOpenAi = toOpenAiMessages(trimmed);
  const textOnly = toTextOnlyMessages(trimmed);
  const timeoutMs = cfg.providerTimeoutMs;

  const fastLane: Attempt[] = [];

  if (geminiKey) {
    fastLane.push({
      id: "gemini",
      run: () =>
        geminiComplete(geminiKey, geminiModel, trimmed, timeoutMs, cfg.maxTokens),
    });
  }

  if (apiKey) {
    fastLane.push({
      id: "openai_primary",
      run: () =>
        openaiComplete(
          apiKey,
          primaryModel,
          asOpenAi,
          timeoutMs,
          cfg.maxTokens
        ),
    });
  }

  const raced = await raceFirstSuccess(fastLane, timeoutMs);
  if (raced) return raced;

  const backupLane: Attempt[] = [];

  if (apiKey && fallbackModel !== primaryModel) {
    backupLane.push({
      id: "openai_fallback_model",
      run: () =>
        openaiComplete(
          apiKey,
          fallbackModel,
          toOpenAiMessages(textOnly),
          timeoutMs,
          cfg.maxTokens
        ),
    });
  }

  if (secondaryKey && secondaryKey !== apiKey) {
    backupLane.push({
      id: "openai_secondary_key",
      run: () =>
        openaiComplete(
          secondaryKey,
          fallbackModel,
          toOpenAiMessages(textOnly),
          timeoutMs,
          cfg.maxTokens
        ),
    });
  }

  if (cfg.enableFalChat && falKey) {
    backupLane.push({
      id: "fal_ai",
      run: () =>
        falOpenRouterChatComplete(
          falModel,
          textOnly.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          cfg.falTimeoutMs,
          cfg.maxTokens
        ),
    });
  }

  const sequential = await runSequential(backupLane, timeoutMs);
  if (sequential) return sequential;

  return {
    content:
      "I'm Giga3 AI — I'm having trouble reaching our AI services on this connection. Your message was saved — please tap send again. " +
      "On slower mobile networks, replies usually arrive within a minute when the connection is stable.",
    providerId: "local_fallback",
    usedFallback: true,
  };
}
