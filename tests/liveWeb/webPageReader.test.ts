import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createFetchPageReader } from "../../convex/liveWeb/webPageReader";

describe("webPageReader", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.GIGA3_LIVE_WEB_ENABLED = "true";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retrieves readable text from public HTML pages", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html; charset=utf-8" },
      body: null,
      text: async () =>
        "<html><head><title>Sample Page</title></head><body><p>Public content here.</p></body></html>",
    });

    const reader = createFetchPageReader();
    const page = await reader.read("https://example.com/page", {
      timeoutMs: 5000,
      maxBytes: 50_000,
    });

    expect(page.title).toBe("Sample Page");
    expect(page.text).toContain("Public content here");
    expect(page.domain).toBe("example.com");
    expect(page.excerpt.length).toBeGreaterThan(0);
  });

  it("rejects malicious private URLs", async () => {
    const reader = createFetchPageReader();
    await expect(
      reader.read("http://127.0.0.1/internal", { timeoutMs: 1000, maxBytes: 1000 })
    ).rejects.toThrow(/Blocked/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("times out slow page fetches", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_url, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    const reader = createFetchPageReader();
    await expect(
      reader.read("https://example.com/slow", { timeoutMs: 50, maxBytes: 1000 })
    ).rejects.toThrow(/timed out/i);
  });
});
