import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AFRICAN_VOICE_CATALOG, type AfricanVoiceRecord } from "@/lib/voice/africanVoiceCatalog";
import { createCommercialVoiceProvider, createSelfHostedMmsProvider } from "@/lib/voice/africanVoiceBackends";
import { listVoiceBackends } from "@/lib/voice/africanVoiceProvider";
import {
  HF_INVALID_RESPONSE_MESSAGE,
  HF_NOT_CONFIGURED_MESSAGE,
  HF_PROVIDER_FAILED_MESSAGE,
  HF_TIMEOUT_MESSAGE,
  RESEARCH_ONLY_MESSAGE,
  type Giga3SpeechRequest,
} from "@/lib/voice/africanVoiceTypes";
import { handleGiga3SpeechRequest, runGiga3Speech } from "@/lib/voice/giga3SpeechApi";
import { requestGiga3AfricanSpeech, resolveGiga3SpeechUrl } from "@/lib/voice/giga3SpeechClient";
import {
  buildHfAuthorizationHeader,
  HuggingFaceVoiceError,
  isHuggingFaceVoiceConfigured,
  requestHuggingFaceHostedSpeech,
  type HostedSpeechFetcher,
  type HostedSpeechResponse,
} from "@/lib/voice/huggingFaceTTS";

const WEB_ROOT = join(process.cwd(), "web");
const VOICE_DIR = join(WEB_ROOT, "lib/voice");

function fakeToken(): string {
  return ["test", "hf", "token"].join("-");
}

function speechRequest(language: string, input = "Maakye, akwaaba wɔ Giga3 AI."): Giga3SpeechRequest {
  return {
    model: "giga3-african-voice",
    language,
    voice: "default",
    input,
    response_format: "wav",
  };
}

function decodeJson(body: Uint8Array): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>;
}

function wavResponse(bytes = new Uint8Array([1, 2, 3, 4])): HostedSpeechResponse {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "audio/wav" : null) },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}

function hostedRecord(code: "tw" | "ee"): AfricanVoiceRecord {
  return {
    ...AFRICAN_VOICE_CATALOG[code],
    hostedInferenceAvailable: true,
    commercialProductionEnabled: true,
  };
}

function captureConsole() {
  const methods = ["log", "info", "warn", "error", "debug"] as const;
  const spies = methods.map((method) => vi.spyOn(console, method).mockImplementation(() => {}));
  return {
    text() {
      return spies.flatMap((spy) => spy.mock.calls.map((args) => args.map(String).join(" "))).join("\n");
    },
    restore() {
      spies.forEach((spy) => spy.mockRestore());
    },
  };
}

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "out") continue;
      files.push(...walk(full));
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe("Hugging Face token handling", () => {
  afterEach(() => {
    delete process.env.HF_TOKEN;
    delete process.env.NEXT_PUBLIC_HF_TOKEN;
    vi.restoreAllMocks();
  });

  it("fails safely when HF_TOKEN is missing", async () => {
    const fetchImpl = vi.fn();
    await expect(
      requestHuggingFaceHostedSpeech({
        modelId: "facebook/mms-tts-aka",
        input: "Maakye",
        endpoint: "https://voice.example.test/mms",
        hostedInferenceAvailable: true,
        fetchImpl: fetchImpl as unknown as HostedSpeechFetcher,
      })
    ).rejects.toMatchObject({
      code: "not_configured",
      message: HF_NOT_CONFIGURED_MESSAGE,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isHuggingFaceVoiceConfigured()).toBe(false);
  });

  it("detects HF_TOKEN on the server without returning it", () => {
    process.env.HF_TOKEN = fakeToken();
    process.env.NEXT_PUBLIC_HF_TOKEN = fakeToken();
    expect(isHuggingFaceVoiceConfigured()).toBe(true);
    expect(buildHfAuthorizationHeader()).toBe(`Bearer ${fakeToken()}`);
  });

  it("ignores a public env var when the server token is absent", () => {
    process.env.NEXT_PUBLIC_HF_TOKEN = fakeToken();
    expect(isHuggingFaceVoiceConfigured()).toBe(false);
    expect(() => buildHfAuthorizationHeader()).toThrow(HuggingFaceVoiceError);
    try {
      buildHfAuthorizationHeader();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe(HF_NOT_CONFIGURED_MESSAGE);
      expect((err as Error).message).not.toContain(fakeToken());
    }
  });

  it("constructs the Authorization header only inside the server client", async () => {
    process.env.HF_TOKEN = fakeToken();
    const logs = captureConsole();
    const fetchImpl = vi.fn(async () => wavResponse());
    await requestHuggingFaceHostedSpeech({
      modelId: "facebook/mms-tts-aka",
      input: "Maakye",
      endpoint: "https://voice.example.test/mms",
      hostedInferenceAvailable: true,
      fetchImpl: fetchImpl as unknown as HostedSpeechFetcher,
    });
    const init = fetchImpl.mock.calls[0]?.[1] as { headers: Record<string, string>; body: string };
    expect(init.headers.Authorization).toBe(`Bearer ${fakeToken()}`);
    expect(init.body).not.toContain(fakeToken());
    expect(logs.text()).not.toContain(fakeToken());
    logs.restore();
  });

  it("never logs the token on failure", async () => {
    process.env.HF_TOKEN = fakeToken();
    const logs = captureConsole();
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => "text/plain" },
      arrayBuffer: async () => new TextEncoder().encode(fakeToken()).buffer,
    }));
    await expect(
      requestHuggingFaceHostedSpeech({
        modelId: "facebook/mms-tts-aka",
        input: "Maakye",
        endpoint: "https://voice.example.test/mms",
        hostedInferenceAvailable: true,
        fetchImpl: fetchImpl as unknown as HostedSpeechFetcher,
      })
    ).rejects.toThrow(HF_PROVIDER_FAILED_MESSAGE);
    expect(logs.text()).not.toContain(fakeToken());
    logs.restore();
  });
});

describe("Giga3 African speech routing", () => {
  afterEach(() => {
    delete process.env.HF_TOKEN;
    delete process.env.KHAYA_SUBSCRIPTION_KEY;
  });

  it("routes Akan/Twi to Khaya and does not call Hugging Face", async () => {
    process.env.HF_TOKEN = fakeToken();
    const fetchImpl = vi.fn();
    const response = await runGiga3Speech(speechRequest("tw"), {
      fetchImpl: fetchImpl as unknown as HostedSpeechFetcher,
      endpoint: "https://voice.example.test/mms",
    });
    const body = decodeJson(response.body);
    expect(response.status).toBe(503);
    expect(body.modelId).toBe("ghananlp-tts-v2");
    expect(body.language).toBe("twi");
    expect(body.license).toBe("khaya-eula");
    expect(body.hostedInferenceAvailable).toBe(false);
    expect(body.availability).toBe("khaya");
    expect(body.error).toBe("Khaya language service is not configured.");
    expect(JSON.stringify(body)).not.toContain(fakeToken());
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(AFRICAN_VOICE_CATALOG.tw.khayaLanguage).toBe("twi");
    expect(AFRICAN_VOICE_CATALOG.tw.hostedInferenceAvailable).toBe(false);
  });

  it("routes Ewe to Khaya ISO code ewe", async () => {
    const response = await runGiga3Speech(speechRequest("ee", "Mido gbe na mi."));
    const body = decodeJson(response.body);
    expect(response.status).toBe(503);
    expect(body.language).toBe("ewe");
    expect(body.modelId).toBe("ghananlp-tts-v2");
    expect(body.error).toBe("Khaya language service is not configured.");
    const viaHandler = await handleGiga3SpeechRequest(speechRequest("ee", "Mido gbe na mi."));
    expect(decodeJson(viaHandler.body).language).toBe("ewe");
  });

  it("rejects unknown languages and languages outside commercial Twi and Ewe", async () => {
    const unknown = await handleGiga3SpeechRequest(speechRequest("zz"));
    const unknownBody = decodeJson(unknown.body);
    expect(unknown.status).toBe(422);
    expect(unknownBody.code).toBe("unsupported_language");
    for (const language of ["ha", "yo", "gaa", "dag", "fat"]) {
      const response = await handleGiga3SpeechRequest(speechRequest(language));
      const body = decodeJson(response.body);
      expect(response.status).toBe(422);
      expect(body.code).toBe("unsupported_language");
      expect(body.error).toBe("This language is not supported for Giga3 African voice.");
    }
  });

  it("never selects CC-BY-NC MMS models for commercial Twi or Ewe", async () => {
    const fetchImpl = vi.fn();
    for (const modelId of ["facebook/mms-tts-aka", "facebook/mms-tts-ewe"] as const) {
      const language = modelId.endsWith("aka") ? "tw" : "ee";
      const response = await runGiga3Speech(speechRequest(language), {
        fetchImpl: fetchImpl as unknown as HostedSpeechFetcher,
        endpoint: "https://huggingface.co/facebook/" + modelId,
        catalogLookup: () => ({
          ...hostedRecord(language),
          modelId,
          license: "cc-by-nc-4.0",
          commercialProductionEnabled: true,
          hostedInferenceAvailable: true,
          khayaLanguage: language === "tw" ? "twi" : "ewe",
          availability: "khaya",
        }),
      });
      const body = decodeJson(response.body);
      expect(response.status).toBe(503);
      expect(body.code).toBe("not_enabled");
      expect(body.error).toBe(RESEARCH_ONLY_MESSAGE);
      expect(body.commercialProductionEnabled).toBe(false);
      expect(body.modelId).toBe(modelId);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
    for (const record of Object.values(AFRICAN_VOICE_CATALOG)) {
      expect(record.modelId).not.toBe("facebook/mms-tts-aka");
      expect(record.modelId).not.toBe("facebook/mms-tts-ewe");
      expect(record.hostedInferenceAvailable).toBe(false);
    }
  });

  it("leaves English on the device speech path", async () => {
    const response = await handleGiga3SpeechRequest(speechRequest("en", "Hello from Giga3."));
    const body = decodeJson(response.body);
    expect(response.status).toBe(422);
    expect(body.error).toBe("English stays on the device speech path.");
  });

  it("keeps self-hosted and commercial backends unconnected", async () => {
    expect(listVoiceBackends()).toEqual(["huggingface-hosted", "self-hosted-mms", "commercial"]);
    await expect(createSelfHostedMmsProvider().synthesize()).resolves.toMatchObject({
      ok: false,
      code: "not_configured",
    });
    await expect(createCommercialVoiceProvider().synthesize()).resolves.toMatchObject({
      ok: false,
      code: "not_configured",
    });
  });
});

describe("hosted provider failures", () => {
  afterEach(() => {
    delete process.env.HF_TOKEN;
    vi.restoreAllMocks();
  });

  it("maps provider failure without returning the token", async () => {
    process.env.HF_TOKEN = fakeToken();
    const logs = captureConsole();
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      headers: { get: () => "text/plain" },
      arrayBuffer: async () => new TextEncoder().encode(`token=${fakeToken()}`).buffer,
    }));
    const response = await runGiga3Speech(speechRequest("tw"), {
      fetchImpl: fetchImpl as unknown as HostedSpeechFetcher,
      endpoint: "https://voice.example.test/mms",
      catalogLookup: () => hostedRecord("tw"),
    });
    const body = decodeJson(response.body);
    expect(response.status).toBe(502);
    expect(body.code).toBe("provider_failure");
    expect(body.error).toBe(HF_PROVIDER_FAILED_MESSAGE);
    expect(JSON.stringify(body)).not.toContain(fakeToken());
    expect(logs.text()).not.toContain(fakeToken());
    logs.restore();
  });

  it("maps timeouts to a sanitized error", async () => {
    process.env.HF_TOKEN = fakeToken();
    const fetchImpl: HostedSpeechFetcher = (_input, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    const response = await runGiga3Speech(speechRequest("ee"), {
      fetchImpl,
      endpoint: "https://voice.example.test/mms",
      timeoutMs: 20,
      catalogLookup: () => hostedRecord("ee"),
    });
    const body = decodeJson(response.body);
    expect(response.status).toBe(504);
    expect(body.code).toBe("timeout");
    expect(body.error).toBe(HF_TIMEOUT_MESSAGE);
    expect(JSON.stringify(body)).not.toContain(fakeToken());
  });

  it("rejects an invalid hosted response", async () => {
    process.env.HF_TOKEN = fakeToken();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({ token: fakeToken() })).buffer,
    }));
    const response = await runGiga3Speech(speechRequest("tw"), {
      fetchImpl: fetchImpl as unknown as HostedSpeechFetcher,
      endpoint: "https://voice.example.test/mms",
      catalogLookup: () => hostedRecord("tw"),
    });
    const body = decodeJson(response.body);
    expect(response.status).toBe(502);
    expect(body.code).toBe("invalid_response");
    expect(body.error).toBe(HF_INVALID_RESPONSE_MESSAGE);
    expect(JSON.stringify(body)).not.toContain(fakeToken());
  });
});

describe("PWA speech client", () => {
  afterEach(() => {
    delete process.env.HF_TOKEN;
    vi.restoreAllMocks();
  });

  it("calls the Giga3 server and does not send HF_TOKEN", async () => {
    process.env.HF_TOKEN = fakeToken();
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      headers: { get: () => "application/json" },
      json: async () => ({ error: RESEARCH_ONLY_MESSAGE, token: fakeToken() }),
    }));
    const result = await requestGiga3AfricanSpeech(speechRequest("tw"), {
      baseUrl: "https://perfect-lark-521.convex.site",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual({ ok: false, status: 503, error: RESEARCH_ONLY_MESSAGE });
    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe("https://perfect-lark-521.convex.site/v1/audio/speech");
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.stringify(init.headers)).not.toContain(fakeToken());
    expect(init.body).not.toContain(fakeToken());
    expect(resolveGiga3SpeechUrl("https://router.huggingface.co")).toBeNull();
    expect(resolveGiga3SpeechUrl("https://api-inference.huggingface.co")).toBeNull();
  });

  it("strips credential-shaped text from server errors", async () => {
    const leaked = `Bearer ${fakeToken()}`;
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 502,
      headers: { get: () => "application/json" },
      json: async () => ({ error: leaked }),
    }));
    const result = await requestGiga3AfricanSpeech(speechRequest("ee"), {
      baseUrl: "https://example.test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain(fakeToken());
      expect(result.error).toContain("[redacted]");
    }
  });

  it("does not reference HF_TOKEN from client modules", () => {
    const clientSource = readFileSync(join(VOICE_DIR, "giga3SpeechClient.ts"), "utf8");
    expect(clientSource.includes("HF_TOKEN")).toBe(false);
    expect(clientSource.includes("Authorization")).toBe(false);
    expect(clientSource.includes("process.env")).toBe(false);

    const serverReaders = walk(VOICE_DIR).filter((file) => readFileSync(file, "utf8").includes("process.env.HF_TOKEN"));
    expect(serverReaders.map((file) => file.slice(VOICE_DIR.length + 1))).toEqual(["huggingFaceTTS.ts"]);

    const clientRoots = ["components", "app", "hooks"].flatMap((dir) => walk(join(WEB_ROOT, dir)));
    const hits = clientRoots.filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes("HF_TOKEN") || source.includes("huggingFaceTTS") || source.includes("NEXT_PUBLIC_HF_TOKEN");
    });
    expect(hits).toEqual([]);
  });
});
