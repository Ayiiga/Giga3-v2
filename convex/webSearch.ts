/**
 * Web search augmentation for Gemini via Google Search grounding.
 * Falls back silently when grounding is unavailable.
 */

export type GroundingSource = {
  title: string;
  uri: string;
};

export type GroundingResult = {
  text: string;
  sources: GroundingSource[];
  usedGrounding: boolean;
};

function groundingEnabled(): boolean {
  return process.env.CHAT_ENABLE_WEB_SEARCH !== "false";
}

function extractGroundingSources(data: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { title?: string; uri?: string };
      }>;
    };
  }>;
}): GroundingSource[] {
  const chunks =
    data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const web = chunk.web;
    if (web?.uri) {
      sources.push({
        title: web.title?.trim() || web.uri,
        uri: web.uri,
      });
    }
  }
  return sources;
}

export async function geminiGenerateWithGrounding(args: {
  apiKey: string;
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  timeoutMs: number;
  maxTokens: number;
  enableWebSearch: boolean;
}): Promise<GroundingResult> {
  const systemText = args.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = args.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

  if (contents.length === 0) {
    throw new Error("No user/assistant messages for Gemini grounding");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: args.maxTokens,
    },
  };

  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  if (args.enableWebSearch && groundingEnabled()) {
    body.tools = [{ google_search: {} }];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
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
      throw new Error(`Gemini grounding timed out after ${args.timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini grounding HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { title?: string; uri?: string };
        }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Empty response from Gemini grounding");
  }

  const sources = extractGroundingSources(data);
  return {
    text,
    sources,
    usedGrounding: sources.length > 0,
  };
}

export function appendGroundingCitations(
  answer: string,
  sources: GroundingSource[]
): string {
  if (!sources.length) return answer;
  const unique = new Map<string, GroundingSource>();
  for (const source of sources) {
    if (!unique.has(source.uri)) unique.set(source.uri, source);
  }
  const lines = [...unique.values()].slice(0, 5).map((s, i) => {
    return `[${i + 1}] ${s.title} — ${s.uri}`;
  });
  return `${answer}\n\n**Sources**\n${lines.join("\n")}`;
}
