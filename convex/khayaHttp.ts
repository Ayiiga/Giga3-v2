import { httpAction } from "./_generated/server";
import { transcribeWithKhaya } from "./khaya/asr";
import { KhayaServiceError, sanitizeKhayaMessage } from "./khaya/subscription";
import { handleGiga3SpeechRequest } from "./khaya/speech";
import { translateWithKhaya } from "./khaya/translate";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Cache-Control": "no-store",
};

function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

function jsonError(status: number, error: string, code: string): Response {
  return new Response(JSON.stringify({ error: sanitizeKhayaMessage(error), code }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function fromKhayaError(err: unknown): Response {
  if (err instanceof KhayaServiceError) return jsonError(err.status, err.message, err.code);
  return jsonError(502, "Khaya language service failed.", "provider_failure");
}

export const khayaSpeechOptions = httpAction(async () => preflight());

export const khayaSpeech = httpAction(async (_ctx, request) => {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const result = await handleGiga3SpeechRequest(body);
  const bytes = result.body.buffer.slice(result.body.byteOffset, result.body.byteOffset + result.body.byteLength) as ArrayBuffer;
  return new Response(bytes, {
    status: result.status,
    headers: { ...CORS, ...result.headers },
  });
});

export const khayaTranslateOptions = httpAction(async () => preflight());

export const khayaTranslate = httpAction(async (_ctx, request) => {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "Invalid translation request.", "invalid_request");
  }
  const record = body as Record<string, unknown>;
  if (typeof record.text !== "string" || typeof record.source !== "string" || typeof record.target !== "string") {
    return jsonError(400, "Invalid translation request.", "invalid_request");
  }
  try {
    const translated = await translateWithKhaya({
      text: record.text,
      source: record.source,
      target: record.target,
    });
    return new Response(JSON.stringify(translated), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    return fromKhayaError(err);
  }
});

export const khayaTranscribeOptions = httpAction(async () => preflight());

export const khayaTranscribe = httpAction(async (_ctx, request) => {
  const url = new URL(request.url);
  const language = url.searchParams.get("language") ?? "";
  const timestamps = url.searchParams.get("timestamps");
  const contentType = request.headers.get("content-type") ?? "";
  const audio = new Uint8Array(await request.arrayBuffer());
  try {
    const transcript = await transcribeWithKhaya({
      audio,
      contentType,
      language,
      timestamps: timestamps === "word" || timestamps === "segment" ? timestamps : undefined,
    });
    return new Response(JSON.stringify(transcript), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    return fromKhayaError(err);
  }
});
