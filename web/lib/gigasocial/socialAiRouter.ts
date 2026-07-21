/**
 * Scalable social AI provider abstraction — separate from chat `aiRouter`.
 * UI never binds to a specific vendor; switching providers does not change components.
 */

export type SocialAiProviderId = "local" | "openai" | "gemini" | "opensource" | "future";

export type SocialAiRequestKind =
  | "caption"
  | "moderation_suggest"
  | "summary"
  | "translate"
  | "insight";

export type SocialAiRequest = {
  kind: SocialAiRequestKind;
  prompt: string;
  locale?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
};

export type SocialAiResponse = {
  provider: SocialAiProviderId;
  text: string;
  suggestionOnly: true;
};

const STORAGE_KEY = "giga3_gigasocial_ai_provider";

export const SOCIAL_AI_PROVIDERS: {
  id: SocialAiProviderId;
  label: string;
  available: boolean;
}[] = [
  { id: "local", label: "Giga3 Local Heuristics", available: true },
  { id: "openai", label: "OpenAI", available: false },
  { id: "gemini", label: "Gemini", available: false },
  { id: "opensource", label: "Open-source models", available: false },
  { id: "future", label: "Future providers", available: false },
];

export function readSocialAiProvider(): SocialAiProviderId {
  if (typeof window === "undefined") return "local";
  try {
    const raw = localStorage.getItem(STORAGE_KEY) as SocialAiProviderId | null;
    if (raw && SOCIAL_AI_PROVIDERS.some((p) => p.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return "local";
}

export function writeSocialAiProvider(provider: SocialAiProviderId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, provider);
  } catch {
    /* ignore */
  }
}

/** Local fallback — production-safe when remote providers are not configured. */
export async function runSocialAi(
  request: SocialAiRequest,
  provider: SocialAiProviderId = readSocialAiProvider()
): Promise<SocialAiResponse> {
  // Remote providers reserved for future Convex actions — never break UI.
  const effective: SocialAiProviderId =
    SOCIAL_AI_PROVIDERS.find((p) => p.id === provider)?.available === true ? provider : "local";

  const text = localSocialAi(request);
  return { provider: effective, text, suggestionOnly: true };
}

function localSocialAi(request: SocialAiRequest): string {
  const prompt = request.prompt.trim();
  switch (request.kind) {
    case "translate":
      return `[Suggested translation]\n${prompt}`;
    case "moderation_suggest":
      return "Review recommended. Do not auto-remove content — ask a human moderator.";
    case "summary":
      return prompt
        ? `Summary: ${prompt.slice(0, 180)}${prompt.length > 180 ? "…" : ""}`
        : "No activity to summarize yet.";
    case "insight":
      return "Try posting between 6–8 PM and reply to new members within 24 hours.";
    case "caption":
    default:
      return prompt || "Share something valuable with your community today.";
  }
}
