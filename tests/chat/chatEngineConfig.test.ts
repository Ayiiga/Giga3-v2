import { describe, expect, it } from "vitest";
import {
  looksLikeOpenAiApiKey,
  looksLikeOpenAiModel,
  normalizeGeminiChatModel,
} from "../../convex/chatEngine";

describe("looksLikeOpenAiModel", () => {
  it("accepts real model ids", () => {
    for (const m of ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo", "o3-mini", "chatgpt-4o-latest"]) {
      expect(looksLikeOpenAiModel(m)).toBe(true);
    }
  });

  it("rejects pasted secrets and keys (the prod misconfiguration)", () => {
    for (const m of [
      "domain_pk_6a1f823693888193b2a3d30c9b037d710615e83677803824",
      "sk-proj-abcdef1234567890",
      "pk_live_abc123",
      "rk_test_abc",
    ]) {
      expect(looksLikeOpenAiModel(m)).toBe(false);
    }
  });

  it("rejects empty / oversized / garbage values", () => {
    expect(looksLikeOpenAiModel(undefined)).toBe(false);
    expect(looksLikeOpenAiModel("")).toBe(false);
    expect(looksLikeOpenAiModel("  ")).toBe(false);
    expect(looksLikeOpenAiModel("a".repeat(80))).toBe(false);
    expect(looksLikeOpenAiModel("has spaces in it")).toBe(false);
  });
});

describe("looksLikeOpenAiApiKey", () => {
  it("accepts sk- keys", () => {
    expect(looksLikeOpenAiApiKey("sk-proj-abcdefghijklmnopqrstuvwxyz")).toBe(true);
  });
  it("rejects non-key values", () => {
    expect(looksLikeOpenAiApiKey(undefined)).toBe(false);
    expect(looksLikeOpenAiApiKey("")).toBe(false);
    expect(looksLikeOpenAiApiKey("gpt-4o")).toBe(false);
    expect(looksLikeOpenAiApiKey("pk_live_x")).toBe(false);
    expect(looksLikeOpenAiApiKey("sk-short")).toBe(false);
  });
});

describe("normalizeGeminiChatModel", () => {
  it("keeps plain chat models and strips models/ prefix", () => {
    expect(normalizeGeminiChatModel("gemini-2.5-flash")).toBe("gemini-2.5-flash");
    expect(normalizeGeminiChatModel("models/gemini-2.5-flash")).toBe("gemini-2.5-flash");
  });
  it("replaces image models with the chat default", () => {
    expect(normalizeGeminiChatModel("imagen-4.0-fast-generate-001")).toBe("gemini-2.5-flash");
  });
});
