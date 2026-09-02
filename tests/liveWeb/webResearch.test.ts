import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createSerperSearchProvider } from "../../convex/liveWeb/providers/serperSearchProvider";
import { resolveWebSearchProvider } from "../../convex/liveWeb/providers/registry";
import { runWebResearch } from "../../convex/liveWeb/webResearchOrchestrator";

describe("Serper search provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SERPER_API_KEY;
    delete process.env.BRAVE_SEARCH_API_KEY;
  });

  it("returns structured search results on success", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [
          {
            title: "Example News",
            link: "https://example.com/story",
            snippet: "Breaking update",
          },
        ],
      }),
    });

    const provider = createSerperSearchProvider("test-key");
    const results = await provider.search("latest news", {
      maxResults: 3,
      timeoutMs: 5000,
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Example News");
    expect(results[0].domain).toBe("example.com");
  });

  it("surfaces provider failure without fake results", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "unavailable",
    });

    const provider = createSerperSearchProvider("test-key");
    await expect(
      provider.search("query", { maxResults: 1, timeoutMs: 1000 })
    ).rejects.toThrow(/503/);
  });
});

describe("resolveWebSearchProvider", () => {
  afterEach(() => {
    delete process.env.SERPER_API_KEY;
    delete process.env.BRAVE_SEARCH_API_KEY;
  });

  it("prefers Serper when configured", () => {
    process.env.SERPER_API_KEY = "serper-key";
    expect(resolveWebSearchProvider()?.id).toBe("serper");
  });

  it("returns null when no search API is configured", () => {
    expect(resolveWebSearchProvider()).toBeNull();
  });
});

describe("runWebResearch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.GIGA3_LIVE_WEB_ENABLED = "true";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GIGA3_LIVE_WEB_ENABLED;
    delete process.env.SERPER_API_KEY;
  });

  it("reports missing search API honestly (no fake citations)", async () => {
    const result = await runWebResearch({ query: "today's tech news" });
    expect(result.sources).toEqual([]);
    expect(result.warnings.some((w) => w.includes("No dedicated search API"))).toBe(true);
  });

  it("invokes progress stages during research", async () => {
    process.env.SERPER_API_KEY = "key";
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("serper")) {
        return {
          ok: true,
          json: async () => ({
            organic: [{ title: "A", link: "https://example.com/a", snippet: "a" }],
          }),
        };
      }
      return {
        ok: true,
        headers: { get: () => "text/html" },
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
          cancel: async () => undefined,
        },
        text: async () => "<html><title>A</title><body><p>Hello world</p></body></html>",
      };
    });

    const stages: string[] = [];
    await runWebResearch({
      query: "compare sources https://example.com/a",
      onProgress: async (stage) => {
        stages.push(stage);
      },
    });

    expect(stages).toContain("searching");
    expect(stages).toContain("preparing_answer");
  });
});
