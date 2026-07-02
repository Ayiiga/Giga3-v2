
import OpenAI from "openai";
import { falOpenRouterChatComplete, getFalApiKey } from "./falClient";
import {
  appendGroundingCitations,
  geminiGenerateWithGrounding,
} from "./webSearch";
import {
  buildChatRoutePlan,
  resolveAiProviderTier,
  shouldStartFailoverAttempt,
  type AiProviderTier,
  type ChatProviderId,
  type ChatRoutePlan,
} from "./providerRouter";

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

export type ChatRoutingContext = {
  tier: AiProviderTier;
  mode: string;
  query: string;
  chatSystem?: string;
};

export type ChatEngineResult = {
  content: string;
  providerId: string;
  /** True if not the tier's primary provider path */
  usedFallback: boolean;
  usedWebSearch?: boolean;
  latencyMs?: number;
};

export type ImageProcessingCapabilityStatus =
  | "not_requested"
  | "available"
  | "analysis_unavailable"
  | "upload_failed"
  | "unsupported_format";

export type ImageProcessingCapability = {
  status: ImageProcessingCapabilityStatus;
  supportedFormats: string[];
};

const PROVIDER_LABELS: Record<string, string> = {
  openai_primary: "OpenAI (Premium)",
  openai_fallback_model: "OpenAI (backup model)",
  openai_secondary_key: "OpenAI (secondary key)",
  openai_image: "OpenAI Images",
  gemini: "Google Gemini (Free)",
  fal_ai: "fal.ai (OpenRouter)",
  local_fallback: "Service notice",
};

export function getChatProviderLabel(providerId: string): string {
  return PROVIDER_LABELS[providerId] ?? providerId;
}

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function assessImageProcessingCapability(
  attachments: ChatCompletionAttachment[]
): ImageProcessingCapability {
  const imageAttachments = attachments.filter((a) => a.kind === "image");
  const supportedFormats = ["JPG", "PNG", "WEBP", "GIF"];
  if (imageAttachments.length === 0) {
    return { status: "not_requested", supportedFormats };
  }

  const hasUnsupportedFormat = imageAttachments.some((attachment) => {
    const mime = attachment.mimeType?.toLowerCase().trim();
    if (!mime) return false;
    return !SUPPORTED_IMAGE_MIME_TYPES.has(mime);
  });
  if (hasUnsupportedFormat) {
    return { status: "unsupported_format", supportedFormats };
  }

  const hasMissingInlineImage = imageAttachments.some(
    (attachment) => !attachment.dataUrl
  );
  if (hasMissingInlineImage) {
    return { status: "upload_failed", supportedFormats };
  }

  const visionEnabled = process.env.CHAT_ENABLE_VISION !== "false";
  const hasVisionProvider = Boolean(
    process.env.GEMINI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  );
  if (!visionEnabled || !hasVisionProvider) {
    return { status: "analysis_unavailable", supportedFormats };
  }

  return { status: "available", supportedFormats };
}

/**
 * Sanity-check an OpenAI model id from env. Misconfigured deployments have
 * shipped pasted secrets (e.g. "domain_pk_…", "sk-…") in OPENAI_FALLBACK_MODEL,
 * which makes every failover attempt fail with model_not_found and wastes
 * failover budget while a user is waiting. Reject anything that looks like a
 * key/secret rather than a model id.
 */
export function looksLikeOpenAiModel(raw: string | undefined): boolean {
  const model = raw?.trim() ?? "";
  if (!model || model.length > 64) return false;
  if (/^(sk|pk|rk)[-_]/i.test(model)) return false;
  if (/_(pk|sk)_/i.test(model)) return false;
  if (/^domain[-_]/i.test(model)) return false;
  return /^[a-z0-9][a-z0-9._:/-]*$/i.test(model);
}

/** OpenAI API keys start with "sk-"; anything else is a misconfiguration. */
export function looksLikeOpenAiApiKey(raw: string | undefined): boolean {
  const key = raw?.trim() ?? "";
  return key.startsWith("sk-") && key.length >= 20;
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
    // Overall wall-clock budget for the whole failover chain. Bounds worst-case
    // latency (sequential providers × per-provider timeout) so a reply — real or
    // graceful fallback — is always persisted well before the client's spinner
    // deadline. Keep this comfortably below CHAT_REPLY_WAIT_MS on the client.
    totalBudgetMs: Number(process.env.CHAT_TOTAL_BUDGET_MS) || 100_000,
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

function hasInlineImageAttachments(messages: ChatCompletionMessage[]): boolean {
  return messages.some((message) =>
    (message.attachments ?? []).some(
      (attachment) => attachment.kind === "image" && Boolean(attachment.dataUrl)
    )
  );
}

async function geminiComplete(
  apiKey: string,
  model: string,
  messages: ChatCompletionMessage[],
  timeoutMs: number,
  maxTokens: number,
  enableWebSearch: boolean
): Promise<{ text: string; usedWebSearch: boolean }> {
  const hasVisionImages = hasInlineImageAttachments(messages);

  if (enableWebSearch && !hasVisionImages) {
    // Bound the grounded (web search) attempt so a slow grounding call cannot
    // consume the whole provider budget — the plain completion below must still
    // have time to run, otherwise the entire Gemini attempt times out and the
    // user waits through another failover (or gets the fallback message).
    const groundingTimeoutMs = Math.min(
      Number(process.env.CHAT_WEB_SEARCH_TIMEOUT_MS) || 12_000,
      Math.floor(timeoutMs * 0.55)
    );
    try {
      const grounded = await geminiGenerateWithGrounding({
        apiKey,
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: textForFallback(m),
        })),
        timeoutMs: groundingTimeoutMs,
        maxTokens,
        enableWebSearch: true,
      });
      return {
        text: appendGroundingCitations(grounded.text, grounded.sources),
        usedWebSearch: grounded.usedGrounding,
      };
    } catch (err) {
      console.warn("[chatEngine] Gemini grounding failed, falling back:", err);
    }
  }

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
  return { text, usedWebSearch: false };
}

type Attempt = {
  id: ChatProviderId;
  run: () => Promise<{ content: string; usedWebSearch?: boolean }>;
};

function buildProviderAttempts(args: {
  plan: ChatRoutePlan;
  trimmed: ChatCompletionMessage[];
  textOnly: ChatCompletionMessage[];
  asOpenAi: OpenAI.Chat.ChatCompletionMessageParam[];
  timeoutMs: number;
  maxTokens: number;
  apiKey?: string;
  primaryModel: string;
  fallbackModel: string;
  secondaryKey?: string;
  geminiKey?: string;
  geminiModel: string;
  falKey?: string;
  falModel: string;
  falTimeoutMs: number;
  enableFalChat: boolean;
}): Attempt[] {
  const attempts: Attempt[] = [];

  for (const providerId of args.plan.failoverOrder) {
    if (providerId === "gemini" && args.geminiKey) {
      attempts.push({
        id: "gemini",
        run: async () => {
          const result = await geminiComplete(
            args.geminiKey as string,
            args.geminiModel,
            args.trimmed,
            args.timeoutMs,
            args.maxTokens,
            args.plan.enableWebSearch
          );
          return { content: result.text, usedWebSearch: result.usedWebSearch };
        },
      });
      continue;
    }

    if (providerId === "openai_primary" && args.apiKey) {
      attempts.push({
        id: "openai_primary",
        run: async () => ({
          content: await openaiComplete(
            args.apiKey as string,
            args.primaryModel,
            args.asOpenAi,
            args.timeoutMs,
            args.maxTokens
          ),
        }),
      });
      continue;
    }

    if (providerId === "openai_fallback_model" && args.apiKey && args.fallbackModel !== args.primaryModel) {
      attempts.push({
        id: "openai_fallback_model",
        run: async () => ({
          content: await openaiComplete(
            args.apiKey as string,
            args.fallbackModel,
            toOpenAiMessages(args.textOnly),
            args.timeoutMs,
            args.maxTokens
          ),
        }),
      });
      continue;
    }

    if (
      providerId === "openai_secondary_key" &&
      args.secondaryKey &&
      args.secondaryKey !== args.apiKey
    ) {
      attempts.push({
        id: "openai_secondary_key",
        run: async () => ({
          content: await openaiComplete(
            args.secondaryKey as string,
            args.fallbackModel,
            toOpenAiMessages(args.textOnly),
            args.timeoutMs,
            args.maxTokens
          ),
        }),
      });
      continue;
    }

    if (providerId === "fal_ai" && args.enableFalChat && args.falKey) {
      attempts.push({
        id: "fal_ai",
        run: async () => ({
          content: await falOpenRouterChatComplete(
            args.falModel,
            args.textOnly.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            args.falTimeoutMs,
            args.maxTokens
          ),
        }),
      });
    }
  }

  return attempts;
}

async function runSequentialPlan(
  attempts: Attempt[],
  primaryProvider: ChatProviderId,
  timeoutMs: number,
  budgetMs = Number.POSITIVE_INFINITY
): Promise<ChatEngineResult | null> {
  const planStarted = Date.now();
  for (const attempt of attempts) {
    // Stop starting new provider attempts once the overall budget is spent so
    // the worker returns a fallback instead of stacking timeouts for minutes.
    if (
      !shouldStartFailoverAttempt({
        elapsedMs: Date.now() - planStarted,
        budgetMs,
        isPrimary: attempt.id === primaryProvider,
      })
    ) {
      console.warn(
        JSON.stringify({
          service: "giga3-chat-engine",
          event: "failover_budget_exhausted",
          skippedProviderId: attempt.id,
          budgetMs,
          totalMs: Date.now() - planStarted,
          ts: Date.now(),
        })
      );
      break;
    }
    const attemptStarted = Date.now();
    console.log(
      JSON.stringify({
        service: "giga3-chat-engine",
        event: "provider_attempt_start",
        providerId: attempt.id,
        timeoutMs,
        ts: attemptStarted,
      })
    );
    try {
      const result = await withProviderTimeout(attempt.id, timeoutMs, attempt.run);
      const latencyMs = Date.now() - attemptStarted;
      console.log(
        JSON.stringify({
          service: "giga3-chat-engine",
          event: "provider_attempt_success",
          providerId: attempt.id,
          latencyMs,
          totalMs: Date.now() - planStarted,
          ts: Date.now(),
        })
      );
      return {
        content: result.content,
        providerId: attempt.id,
        usedFallback: attempt.id !== primaryProvider,
        usedWebSearch: result.usedWebSearch,
        latencyMs,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        JSON.stringify({
          service: "giga3-chat-engine",
          event: "provider_attempt_failed",
          providerId: attempt.id,
          error: msg,
          latencyMs: Date.now() - attemptStarted,
          ts: Date.now(),
        })
      );
    }
  }
  return null;
}

export async function completeChatWithFailover(
  messages: ChatCompletionMessage[],
  routing?: ChatRoutingContext
): Promise<ChatEngineResult> {
  const started = Date.now();
  const cfg = chatConfig();
  const trimmed = trimChatMessages(messages, cfg.maxDialogueMessages);

  const query =
    routing?.query ??
    [...trimmed].reverse().find((m) => m.role === "user")?.content ??
    "";

  const hasAttachments = trimmed.some((m) => (m.attachments?.length ?? 0) > 0);
  const hasImageAttachment = hasInlineImageAttachments(trimmed);
  const tier = routing?.tier ?? "free";
  const mode = routing?.mode ?? "general";

  const plan = buildChatRoutePlan({
    tier,
    mode,
    query,
    hasAttachments,
    hasImageAttachment,
    chatSystem: routing?.chatSystem,
  });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const primaryModel = looksLikeOpenAiModel(process.env.OPENAI_MODEL)
    ? (process.env.OPENAI_MODEL as string).trim()
    : "gpt-4o-mini";
  const premiumModel = looksLikeOpenAiModel(process.env.OPENAI_PREMIUM_MODEL)
    ? (process.env.OPENAI_PREMIUM_MODEL as string).trim()
    : "gpt-4o";
  const openAiModel = tier === "premium" ? premiumModel : primaryModel;
  const fallbackModel = looksLikeOpenAiModel(process.env.OPENAI_FALLBACK_MODEL)
    ? (process.env.OPENAI_FALLBACK_MODEL as string).trim()
    : "gpt-3.5-turbo";
  const secondaryKeyRaw = process.env.OPENAI_FALLBACK_API_KEY?.trim();
  const secondaryKey = looksLikeOpenAiApiKey(secondaryKeyRaw)
    ? secondaryKeyRaw
    : undefined;
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel = normalizeGeminiChatModel(
    process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
  );
  const falKey = getFalApiKey();
  const falModel =
    process.env.FAL_MODEL ?? process.env.FAL_LLM_MODEL ?? "google/gemini-2.0-flash";

  const maxTokens = Math.round(cfg.maxTokens * plan.maxTokensMultiplier);
  const asOpenAi = toOpenAiMessages(trimmed);
  const textOnly = toTextOnlyMessages(trimmed);
  const timeoutMs = hasImageAttachment
    ? Math.max(cfg.providerTimeoutMs, 45_000)
    : cfg.providerTimeoutMs;

  const attempts = buildProviderAttempts({
    plan,
    trimmed,
    textOnly,
    asOpenAi,
    timeoutMs,
    maxTokens,
    apiKey,
    primaryModel: openAiModel,
    fallbackModel,
    secondaryKey,
    geminiKey,
    geminiModel,
    falKey,
    falModel,
    falTimeoutMs: cfg.falTimeoutMs,
    enableFalChat: cfg.enableFalChat,
  });

  const sequential = await runSequentialPlan(
    attempts,
    plan.primaryProvider,
    timeoutMs,
    cfg.totalBudgetMs
  );
  if (sequential) return sequential;

  return {
    content:
      "I'm Giga3 AI — I'm having trouble reaching our AI services on this connection. Your message was saved — please tap send again. " +
      "On slower mobile networks, replies usually arrive within a minute when the connection is stable.",
    providerId: "local_fallback",
    usedFallback: true,
    latencyMs: Date.now() - started,
  };
}

export function buildRoutingContextFromUser(args: {
  subscriptionPlan: string;
  subscriptionExpiresAt?: number | null;
  hasPurchasedCredits?: boolean;
  mode: string;
  query: string;
  chatSystem?: string;
}): ChatRoutingContext {
  return {
    tier: resolveAiProviderTier({
      subscriptionPlan: args.subscriptionPlan,
      subscriptionExpiresAt: args.subscriptionExpiresAt,
      hasPurchasedCredits: args.hasPurchasedCredits,
    }),
    mode: args.mode,
    query: args.query,
    chatSystem: args.chatSystem,
  };
}
