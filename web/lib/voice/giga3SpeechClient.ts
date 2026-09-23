/**
 * Browser/PWA client for African speech.
 * Calls the Giga3 server only. Do not add Hugging Face credentials here.
 * English playback stays on the existing device SpeechSynthesis path.
 */

import { getConvexSiteUrl } from "@/lib/convex/env";
import {
  GIGA3_SPEECH_PATH,
  sanitizePublicVoiceMessage,
  type Giga3SpeechRequest,
} from "@/lib/voice/africanVoiceTypes";

export type Giga3SpeechClientResult =
  | { ok: true; audio: ArrayBuffer; contentType: string }
  | { ok: false; status: number; error: string };

const BLOCKED_HOST_SUFFIX = ".huggingface.co";

function isBlockedVoiceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "huggingface.co" || host.endsWith(BLOCKED_HOST_SUFFIX);
}

export function resolveGiga3SpeechUrl(baseUrl: string): string | null {
  let url: URL;
  try {
    const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    url = new URL(GIGA3_SPEECH_PATH, base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (isBlockedVoiceHost(url.hostname)) return null;
  if (url.username || url.password) return null;
  return url.toString();
}

export async function requestGiga3AfricanSpeech(
  request: Giga3SpeechRequest,
  options: { baseUrl?: string; fetchImpl?: typeof fetch } = {}
): Promise<Giga3SpeechClientResult> {
  const baseUrl = options.baseUrl ?? getConvexSiteUrl();
  if (!baseUrl) {
    return { ok: false, status: 503, error: "Giga3 voice service is not configured." };
  }
  const endpoint = resolveGiga3SpeechUrl(baseUrl);
  if (!endpoint) {
    return { ok: false, status: 400, error: "Giga3 voice requests must stay on the Giga3 server." };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/wav, application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    return { ok: false, status: 502, error: "Giga3 voice service failed." };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (response.ok && contentType.toLowerCase().includes("audio/")) {
    return { ok: true, audio: await response.arrayBuffer(), contentType };
  }

  let error = "Giga3 voice service failed.";
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) {
      error = sanitizePublicVoiceMessage(payload.error);
    }
  } catch {
    error = "Giga3 voice service failed.";
  }
  return { ok: false, status: response.status, error };
}
