/**
 * Server-only Hugging Face speech client.
 * Authorization is built here from process.env.HF_TOKEN and is never returned
 * to browser code. Production MMS Akan/Ewe routing does not call this while
 * hosted inference is unavailable.
 */

import {
  HF_HOSTED_UNAVAILABLE_MESSAGE,
  HF_INVALID_RESPONSE_MESSAGE,
  HF_NOT_CONFIGURED_MESSAGE,
  HF_PROVIDER_FAILED_MESSAGE,
  HF_TIMEOUT_MESSAGE,
  sanitizePublicVoiceMessage,
  type SpeechFailureCode,
} from "@/lib/voice/africanVoiceTypes";

export class HuggingFaceVoiceError extends Error {
  readonly code: SpeechFailureCode;

  constructor(code: SpeechFailureCode, message: string) {
    super(sanitizePublicVoiceMessage(message));
    this.name = "HuggingFaceVoiceError";
    this.code = code;
  }
}

export type HostedSpeechResponse = {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type HostedSpeechFetcher = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  }
) => Promise<HostedSpeechResponse>;

function assertVoiceServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new HuggingFaceVoiceError("not_configured", HF_NOT_CONFIGURED_MESSAGE);
  }
}

function readHfToken(): string | null {
  const token = process.env.HF_TOKEN?.trim();
  if (!token) return null;
  return token;
}

export function isHuggingFaceVoiceConfigured(): boolean {
  assertVoiceServerRuntime();
  return readHfToken() !== null;
}

/** Server-side Authorization value. Throws a sanitized error when unset. */
export function buildHfAuthorizationHeader(): string {
  assertVoiceServerRuntime();
  const token = readHfToken();
  if (!token) {
    throw new HuggingFaceVoiceError("not_configured", HF_NOT_CONFIGURED_MESSAGE);
  }
  return `Bearer ${token}`;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function isWavPayload(contentType: string | null, bytes: Uint8Array): boolean {
  if (!contentType || bytes.byteLength === 0) return false;
  const base = contentType.split(";")[0]?.trim().toLowerCase();
  return base === "audio/wav" || base === "audio/x-wav" || base === "audio/wave";
}

export async function requestHuggingFaceHostedSpeech(args: {
  modelId: string;
  input: string;
  endpoint: string;
  hostedInferenceAvailable: boolean;
  fetchImpl?: HostedSpeechFetcher;
  timeoutMs?: number;
}): Promise<{ audio: Uint8Array; contentType: "audio/wav" }> {
  assertVoiceServerRuntime();
  const authorization = buildHfAuthorizationHeader();
  if (!args.hostedInferenceAvailable) {
    throw new HuggingFaceVoiceError("hosted_unavailable", HF_HOSTED_UNAVAILABLE_MESSAGE);
  }

  const fetchImpl = args.fetchImpl ?? (fetch as unknown as HostedSpeechFetcher);
  const timeoutMs = args.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(args.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        Accept: "audio/wav",
      },
      body: JSON.stringify({
        inputs: args.input,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HuggingFaceVoiceError("provider_failure", HF_PROVIDER_FAILED_MESSAGE);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type");
    if (!isWavPayload(contentType, bytes)) {
      throw new HuggingFaceVoiceError("invalid_response", HF_INVALID_RESPONSE_MESSAGE);
    }
    return { audio: bytes, contentType: "audio/wav" };
  } catch (err) {
    if (err instanceof HuggingFaceVoiceError) throw err;
    if (isAbortError(err)) {
      throw new HuggingFaceVoiceError("timeout", HF_TIMEOUT_MESSAGE);
    }
    throw new HuggingFaceVoiceError("provider_failure", HF_PROVIDER_FAILED_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
}
