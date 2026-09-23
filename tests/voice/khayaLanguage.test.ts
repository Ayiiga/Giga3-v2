import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  khayaSpeechForProfile,
  resolveCommercialKhayaTtsLanguage,
  resolveKhayaTranslationLanguage,
  resolveKhayaTtsLanguage,
} from "../../convex/khaya/languages";
import { transcribeWithKhaya } from "../../convex/khaya/asr";
import { handleGiga3SpeechRequest, synthesizeGiga3AfricanSpeech } from "../../convex/khaya/speech";
import { translateWithKhaya } from "../../convex/khaya/translate";
import type { KhayaFetcher } from "../../convex/khaya/tts";
import { requestGiga3Translation } from "@/lib/khaya/translateClient";
import { GIGA3_AFRICAN_VOICE_MODEL } from "@/lib/voice/africanVoiceTypes";

function fakeKey(): string {
  return ["test", "khaya", "key"].join("-");
}

function wavBytes(): Uint8Array {
  const bytes = new Uint8Array(44);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  return bytes;
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

describe("Khaya language routing", () => {
  afterEach(() => {
    delete process.env.KHAYA_SUBSCRIPTION_KEY;
    delete process.env.KHAYA_API_ORIGIN;
    vi.restoreAllMocks();
  });

  it("maps legacy speech codes to ISO 639-3 and keeps English off Khaya", () => {
    expect(resolveKhayaTtsLanguage("tw")).toBe("twi");
    expect(resolveKhayaTtsLanguage("ee")).toBe("ewe");
    expect(resolveKhayaTtsLanguage("ha")).toBe("hau");
    expect(resolveKhayaTtsLanguage("yo")).toBe("yor");
    expect(resolveKhayaTtsLanguage("gaa")).toBe("gaa");
    expect(resolveKhayaTtsLanguage("dag")).toBe("dag");
    expect(resolveKhayaTtsLanguage("fat")).toBe("fat");
    expect(resolveKhayaTtsLanguage("en")).toBeNull();
    expect(resolveKhayaTtsLanguage("eng")).toBeNull();
    expect(khayaSpeechForProfile("abena-twi")).toEqual({ language: "twi", speaker: "female" });
    expect(khayaSpeechForProfile("kwame-twi")).toEqual({ language: "twi", speaker: "male_low" });
    expect(khayaSpeechForProfile("kofi-ewe")).toEqual({ language: "ewe", speaker: "male_low" });
    expect(khayaSpeechForProfile("english-british")).toBeNull();
    expect(khayaSpeechForProfile("musa-hausa")).toBeNull();
    expect(resolveCommercialKhayaTtsLanguage("tw")).toBe("twi");
    expect(resolveCommercialKhayaTtsLanguage("aka")).toBe("twi");
    expect(resolveCommercialKhayaTtsLanguage("ee")).toBe("ewe");
    expect(resolveCommercialKhayaTtsLanguage("ha")).toBeNull();
    expect(resolveCommercialKhayaTtsLanguage("yo")).toBeNull();
    expect(resolveCommercialKhayaTtsLanguage("gaa")).toBeNull();
    expect(resolveCommercialKhayaTtsLanguage("en")).toBeNull();
  });

  it("maps translation pairs and refuses Hausa, which is not in the translation schema", () => {
    expect(resolveKhayaTranslationLanguage("en")).toBe("eng");
    expect(resolveKhayaTranslationLanguage("tw")).toBe("twi");
    expect(resolveKhayaTranslationLanguage("ee")).toBe("ewe");
    expect(resolveKhayaTranslationLanguage("ha")).toBeNull();
    expect(resolveKhayaTranslationLanguage("hau")).toBeNull();
  });

  it("synthesizes Twi with the subscription header and never returns the key", async () => {
    process.env.KHAYA_SUBSCRIPTION_KEY = fakeKey();
    process.env.KHAYA_API_ORIGIN = "https://khaya.example.test";
    const logs = captureConsole();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "audio/wav" },
      arrayBuffer: async () => wavBytes().buffer,
      text: async () => "",
    }));
    const response = await synthesizeGiga3AfricanSpeech(
      {
        model: "giga3-african-voice",
        language: "tw",
        voice: "abena-twi",
        input: "Maakye, akwaaba wɔ Giga3 AI.",
        response_format: "wav",
      },
      { fetchImpl: fetchImpl as unknown as KhayaFetcher }
    );
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("audio/wav");
    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe("https://khaya.example.test/tts/v2/synthesize");
    expect(init.headers["Ocp-Apim-Subscription-Key"]).toBe(fakeKey());
    expect(init.body).toContain('"language":"twi"');
    expect(init.body).toContain('"speaker_id":"female"');
    expect(init.body).not.toContain(fakeKey());
    expect(url.includes("subscription-key")).toBe(false);
    expect(logs.text()).not.toContain(fakeKey());
    expect(url.includes("facebook/mms-tts")).toBe(false);
    expect(response.body[0]).toBe(0x52);
    expect(response.body[1]).toBe(0x49);
    expect(response.body[2]).toBe(0x46);
    expect(response.body[3]).toBe(0x46);
    logs.restore();
  });

  it("returns playable Ewe audio from the speech handler and keeps the key off the response", async () => {
    process.env.KHAYA_SUBSCRIPTION_KEY = fakeKey();
    process.env.KHAYA_API_ORIGIN = "https://khaya.example.test";
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "audio/wav" },
      arrayBuffer: async () => wavBytes().buffer,
      text: async () => "",
    }));
    const response = await handleGiga3SpeechRequest(
      {
        model: GIGA3_AFRICAN_VOICE_MODEL,
        language: "ee",
        voice: "kofi-ewe",
        input: "Mido gbe na mi.",
        response_format: "wav",
      },
      { fetchImpl: fetchImpl as unknown as KhayaFetcher }
    );
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("audio/wav");
    expect(Array.from(response.body.subarray(0, 4))).toEqual([0x52, 0x49, 0x46, 0x46]);
    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe("https://khaya.example.test/tts/v2/synthesize");
    expect(init.body).toContain('"language":"ewe"');
    expect(init.body).toContain('"speaker_id":"male_low"');
    expect(init.body).not.toContain(fakeKey());
    expect(url.includes("facebook/mms-tts")).toBe(false);
    expect(new TextDecoder().decode(response.body)).not.toContain(fakeKey());
  });

  it("returns a controlled error for English, unsupported languages, and Khaya API failure", async () => {
    process.env.KHAYA_SUBSCRIPTION_KEY = fakeKey();
    const english = await handleGiga3SpeechRequest({
      model: GIGA3_AFRICAN_VOICE_MODEL,
      language: "en",
      voice: "default",
      input: "Hello from Giga3.",
      response_format: "wav",
    });
    expect(english.status).toBe(422);
    expect(new TextDecoder().decode(english.body)).toContain("English stays on the device speech path.");

    const haus = await handleGiga3SpeechRequest({
      model: GIGA3_AFRICAN_VOICE_MODEL,
      language: "ha",
      voice: "default",
      input: "Sannu.",
      response_format: "wav",
    });
    expect(haus.status).toBe(422);
    const hausBody = new TextDecoder().decode(haus.body);
    expect(hausBody).toContain("This language is not supported for Giga3 African voice.");
    expect(hausBody).not.toContain(fakeKey());

    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      headers: { get: () => "text/plain" },
      arrayBuffer: async () => new TextEncoder().encode(fakeKey()).buffer,
      text: async () => fakeKey(),
    }));
    const failed = await handleGiga3SpeechRequest(
      {
        model: GIGA3_AFRICAN_VOICE_MODEL,
        language: "twi",
        voice: "female",
        input: "Maakye",
        response_format: "wav",
      },
      { fetchImpl: fetchImpl as unknown as KhayaFetcher }
    );
    expect(failed.status).toBe(502);
    const failedBody = new TextDecoder().decode(failed.body);
    expect(failedBody).toContain("Khaya language service failed.");
    expect(failedBody).not.toContain(fakeKey());
    expect(failedBody).not.toContain("Ocp-Apim-Subscription-Key");
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url.includes("/tts/v2/synthesize")).toBe(true);
    expect(url.includes("facebook/mms-tts")).toBe(false);
  });

  it("mounts POST /v1/audio/speech on handleGiga3SpeechRequest", () => {
    const http = readFileSync("convex/http.ts", "utf8");
    const action = readFileSync("convex/khayaHttp.ts", "utf8");
    const client = readFileSync("web/lib/voice/giga3SpeechClient.ts", "utf8");
    expect(http).toContain('path: "/v1/audio/speech"');
    expect(http).toContain("handler: khayaSpeech");
    expect(action).toContain("handleGiga3SpeechRequest");
    expect(action.includes("synthesizeGiga3AfricanSpeech")).toBe(false);
    expect(client.includes("KHAYA_SUBSCRIPTION_KEY")).toBe(false);
    expect(client.includes("Ocp-Apim-Subscription-Key")).toBe(false);
    expect(client.includes("HF_TOKEN")).toBe(false);
  });

  it("translates eng-twi and hides the key when the provider fails", async () => {
    process.env.KHAYA_SUBSCRIPTION_KEY = fakeKey();
    process.env.KHAYA_API_ORIGIN = "https://khaya.example.test";
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 400,
      headers: { get: () => "application/json" },
      arrayBuffer: async () => new ArrayBuffer(0),
      text: async () => JSON.stringify({ error: { message: `key ${fakeKey()}` } }),
    }));
    await expect(
      translateWithKhaya({
        text: "Hello, how are you?",
        source: "en",
        target: "tw",
        fetchImpl: fetchImpl as unknown as KhayaFetcher,
      })
    ).rejects.toThrow("Khaya language service rejected the request.");
    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe("https://khaya.example.test/v2/translate");
    expect(init.body).toContain('"lang":"eng-twi"');
    expect(init.headers["Ocp-Apim-Subscription-Key"]).toBe(fakeKey());
    expect(init.body).not.toContain(fakeKey());
  });

  it("returns a translation string from a JSON string body", async () => {
    process.env.KHAYA_SUBSCRIPTION_KEY = fakeKey();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      arrayBuffer: async () => new ArrayBuffer(0),
      text: async () => JSON.stringify("Wo ho te sɛn?"),
    }));
    const result = await translateWithKhaya({
      text: "Hello, how are you?",
      source: "eng",
      target: "twi",
      fetchImpl: fetchImpl as unknown as KhayaFetcher,
    });
    expect(result).toEqual({ text: "Wo ho te sɛn?", source: "eng", target: "twi" });
  });

  it("transcribes Ewe audio without putting the key in the query", async () => {
    process.env.KHAYA_SUBSCRIPTION_KEY = fakeKey();
    process.env.KHAYA_API_ORIGIN = "https://khaya.example.test";
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      arrayBuffer: async () => new ArrayBuffer(0),
      text: async () => JSON.stringify({ text: "Woezo" }),
    }));
    const audio = new Uint8Array([1, 2, 3, 4]);
    const result = await transcribeWithKhaya({
      audio,
      contentType: "audio/wav",
      language: "ee",
      fetchImpl: fetchImpl as unknown as KhayaFetcher,
    });
    expect(result).toEqual({ text: "Woezo", language: "ewe" });
    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe("https://khaya.example.test/asr/v3/transcribe?language=ewe");
    expect(url.includes(fakeKey())).toBe(false);
    expect(init.headers["Ocp-Apim-Subscription-Key"]).toBe(fakeKey());
    expect(init.headers["Content-Type"]).toBe("audio/wav");
  });

  it("times out and rejects an invalid audio response", async () => {
    process.env.KHAYA_SUBSCRIPTION_KEY = fakeKey();
    const hanging: KhayaFetcher = (_input, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    const timedOut = await synthesizeGiga3AfricanSpeech(
      {
        model: "giga3-african-voice",
        language: "ewe",
        voice: "male_low",
        input: "Mido gbe na mi.",
        response_format: "wav",
      },
      { fetchImpl: hanging, timeoutMs: 20 }
    );
    expect(new TextDecoder().decode(timedOut.body)).toContain("Khaya language service timed out.");

    const invalid = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      arrayBuffer: async () => new TextEncoder().encode(fakeKey()).buffer,
      text: async () => fakeKey(),
    }));
    const bad = await synthesizeGiga3AfricanSpeech(
      {
        model: "giga3-african-voice",
        language: "twi",
        voice: "female",
        input: "Maakye",
        response_format: "wav",
      },
      { fetchImpl: invalid as unknown as KhayaFetcher }
    );
    const body = new TextDecoder().decode(bad.body);
    expect(body).toContain("invalid response");
    expect(body).not.toContain(fakeKey());
  });

  it("does not send the subscription key from the translation client", async () => {
    process.env.KHAYA_SUBSCRIPTION_KEY = fakeKey();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ text: "Wo ho te sɛn?", source: "eng", target: "twi" }),
    }));
    const result = await requestGiga3Translation(
      { text: "Hello", source: "eng", target: "twi" },
      { baseUrl: "https://perfect-lark-521.convex.site", fetchImpl: fetchImpl as unknown as typeof fetch }
    );
    expect(result).toEqual({ ok: true, text: "Wo ho te sɛn?", source: "eng", target: "twi" });
    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe("https://perfect-lark-521.convex.site/v1/translate");
    expect(init.headers["Ocp-Apim-Subscription-Key"]).toBeUndefined();
    expect(init.body).not.toContain(fakeKey());
  });
});
