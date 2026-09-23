/**
 * Browser client for Giga3 translation. Calls the Giga3 server only.
 */

import { getConvexSiteUrl } from "@/lib/convex/env";
import { sanitizePublicVoiceMessage } from "@/lib/voice/africanVoiceTypes";
import { resolveGiga3SpeechUrl } from "@/lib/voice/giga3SpeechClient";

export const GIGA3_TRANSLATE_PATH = "/v1/translate";

export type Giga3TranslationResult =
  | { ok: true; text: string; source: string; target: string }
  | { ok: false; status: number; error: string };

export async function requestGiga3Translation(
  request: { text: string; source: string; target: string },
  options: { baseUrl?: string; fetchImpl?: typeof fetch } = {}
): Promise<Giga3TranslationResult> {
  const baseUrl = options.baseUrl ?? getConvexSiteUrl();
  if (!baseUrl) return { ok: false, status: 503, error: "Giga3 voice service is not configured." };
  const endpoint = resolveGiga3SpeechUrl(baseUrl, GIGA3_TRANSLATE_PATH);
  if (!endpoint) return { ok: false, status: 400, error: "Giga3 voice requests must stay on the Giga3 server." };

  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        text: request.text,
        source: request.source,
        target: request.target,
      }),
    });
  } catch {
    return { ok: false, status: 502, error: "Khaya language service failed." };
  }

  try {
    const payload = (await response.json()) as { text?: unknown; source?: unknown; target?: unknown; error?: unknown };
    if (!response.ok) {
      const error = typeof payload.error === "string" ? sanitizePublicVoiceMessage(payload.error) : "Khaya language service failed.";
      return { ok: false, status: response.status, error };
    }
    if (typeof payload.text !== "string" || !payload.text.trim()) {
      return { ok: false, status: 502, error: "Khaya language service returned an invalid response." };
    }
    return {
      ok: true,
      text: payload.text,
      source: typeof payload.source === "string" ? payload.source : request.source,
      target: typeof payload.target === "string" ? payload.target : request.target,
    };
  } catch {
    return { ok: false, status: response.status, error: "Khaya language service failed." };
  }
}
