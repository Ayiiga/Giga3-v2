import { describe, expect, it } from "vitest";
import {
  extractUrlsFromText,
  redactSensitivePatterns,
  validatePublicHttpUrl,
} from "../../convex/liveWeb/liveWebSecurity";

describe("validatePublicHttpUrl", () => {
  it("accepts valid public https URLs", () => {
    const result = validatePublicHttpUrl("https://example.com/news/article");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.domain).toBe("example.com");
    }
  });

  it("rejects localhost and private IPs (SSRF)", () => {
    for (const url of [
      "http://localhost/admin",
      "http://127.0.0.1:8080",
      "http://192.168.1.1",
      "http://10.0.0.5",
      "http://169.254.169.254/latest/meta-data/",
      "http://metadata.google.internal/computeMetadata/v1/",
    ]) {
      const result = validatePublicHttpUrl(url);
      expect(result.ok).toBe(false);
    }
  });

  it("rejects malformed and non-http schemes", () => {
    expect(validatePublicHttpUrl("not-a-url").ok).toBe(false);
    expect(validatePublicHttpUrl("ftp://example.com").ok).toBe(false);
    expect(validatePublicHttpUrl("file:///etc/passwd").ok).toBe(false);
  });

  it("rejects URLs with embedded credentials", () => {
    const result = validatePublicHttpUrl("https://user:pass@example.com");
    expect(result.ok).toBe(false);
  });
});

describe("extractUrlsFromText", () => {
  it("extracts unique valid URLs from user text", () => {
    const urls = extractUrlsFromText(
      "See https://example.com/a and https://example.com/a also http://127.0.0.1"
    );
    expect(urls).toEqual(["https://example.com/a"]);
  });
});

describe("redactSensitivePatterns", () => {
  it("redacts API keys and bearer tokens before model context", () => {
    const redacted = redactSensitivePatterns(
      "Use api_key=sk_live_abcdef1234567890 and Bearer eyJhbGciOiJIUzI1NiJ9"
    );
    expect(redacted).not.toContain("sk_live_");
    expect(redacted).not.toContain("eyJhbGci");
    expect(redacted).toContain("[REDACTED");
  });
});
