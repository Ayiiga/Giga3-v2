import { describe, expect, it } from "vitest";
import {
  CHAT_ERROR_CODES,
  classifyProviderError,
} from "../../convex/chatErrorCodes";

describe("classifyProviderError", () => {
  it("maps timeout errors", () => {
    expect(classifyProviderError("Gemini timed out after 22000ms")).toBe(
      CHAT_ERROR_CODES.PROVIDER_TIMEOUT
    );
  });

  it("maps rate limit errors", () => {
    expect(classifyProviderError("HTTP 429 Too Many Requests")).toBe(
      CHAT_ERROR_CODES.PROVIDER_RATE_LIMIT
    );
  });

  it("maps auth errors", () => {
    expect(classifyProviderError("HTTP 401 invalid api key")).toBe(
      CHAT_ERROR_CODES.PROVIDER_AUTH_ERROR
    );
  });
});
