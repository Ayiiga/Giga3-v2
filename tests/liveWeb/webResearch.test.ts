import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createSerperSearchProvider } from "../../convex/liveWeb/providers/serperSearchProvider";
import { createTavilySearchProvider } from "../../convex/liveWeb/providers/tavilySearchProvider";
import {
  listConfiguredSearchProviders,
  resolveWebSearchProvider,
  resolveWebSearchProviders,
} from "../../convex/liveWeb/providers/registry";
import { newsEvidenceWithGrounding, runWebResearch } from "../../convex/liveWeb/webResearchOrchestrator";

function clearSearchEnv() {
  delete process.env.TAVILY_API_KEY;
  delete process.env.SERPER_API_KEY;
  delete process.env.BRAVE_SEARCH_API_KEY;
}

describe("Tavily search provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearSearchEnv();
  });

  it("returns structured search results on success", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: "Ghana economy update",
            url: "https://example.com/ghana-story",
            content: "Latest macro trends in Accra.",
          },
        ],
      }),
    });

    const provider = createTavilySearchProvider("test-key");
    const results = await provider.search("ghana news", {
      maxResults: 3,
      timeoutMs: 5000,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: "Ghana economy update",
      uri: "https://example.com/ghana-story",
      snippet: "Latest macro trends in Accra.",
      domain: "example.com",
    });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      query: "ghana news",
      search_depth: "basic",
      max_results: 3,
      include_answer: false,
      include_raw_content: false,
    });
  });

  it("normalizes Tavily results into WebSearchResult shape", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: "  Headline  ",
            url: "https://news.example.org/article",
            content: "  Snippet text  ",
          },
          { url: "https://missing-title.example/" },
          { title: "No URL" },
        ],
      }),
    });

    const provider = createTavilySearchProvider("test-key");
    const results = await provider.search("query", { maxResults: 5, timeoutMs: 5000 });

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Headline");
    expect(results[0].uri).toBe("https://news.example.org/article");
    expect(results[0].snippet).toBe("Snippet text");
    expect(results[0].domain).toBe("news.example.org");
    expect(results[1].title).toBe("https://missing-title.example/");
    expect(results[1].domain).toBe("missing-title.example");
  });

  it("surfaces Tavily HTTP failure without fake results", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    });

    const provider = createTavilySearchProvider("test-key");
    await expect(
      provider.search("query", { maxResults: 1, timeoutMs: 1000 })
    ).rejects.toThrow(/Tavily HTTP 401/);
  });
});

describe("Serper search provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearSearchEnv();
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
    clearSearchEnv();
  });

  it("prefers Tavily when configured", () => {
    process.env.TAVILY_API_KEY = "tavily-key";
    expect(resolveWebSearchProvider()?.id).toBe("tavily");
  });

  it("prefers Serper when Tavily is not configured", () => {
    process.env.SERPER_API_KEY = "serper-key";
    expect(resolveWebSearchProvider()?.id).toBe("serper");
  });

  it("returns null when no search API is configured", () => {
    expect(resolveWebSearchProvider()).toBeNull();
  });
});

describe("resolveWebSearchProviders", () => {
  afterEach(() => {
    clearSearchEnv();
  });

  it("orders configured providers tavily → serper → brave", () => {
    process.env.TAVILY_API_KEY = "tavily-key";
    process.env.SERPER_API_KEY = "serper-key";
    process.env.BRAVE_SEARCH_API_KEY = "brave-key";

    expect(resolveWebSearchProviders().map((p) => p.id)).toEqual([
      "tavily",
      "serper",
      "brave",
    ]);
    expect(listConfiguredSearchProviders()).toEqual(["tavily", "serper", "brave"]);
  });

  it("includes only providers with configured API keys", () => {
    process.env.SERPER_API_KEY = "serper-key";
    expect(resolveWebSearchProviders().map((p) => p.id)).toEqual(["serper"]);
    expect(listConfiguredSearchProviders()).toEqual(["serper"]);
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
    clearSearchEnv();
  });

  it("reports missing search API honestly (no fake citations)", async () => {
    const result = await runWebResearch({ query: "today's tech news" });
    expect(result.sources).toEqual([]);
    expect(result.warnings.some((w) => w.includes("No dedicated search API"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("TAVILY_API_KEY"))).toBe(true);
    expect(result.providerId).toBeNull();
  });

  it("uses Tavily when configured and sets providerId", async () => {
    process.env.TAVILY_API_KEY = "tavily-key";
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("tavily.com")) {
        return {
          ok: true,
          json: async () => ({
            results: [{ title: "Tavily hit", url: "https://example.com/t", content: "snippet" }],
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
        text: async () => "<html><title>T</title><body><p>Hello</p></body></html>",
      };
    });

    const result = await runWebResearch({ query: "tech news https://example.com/t" });
    expect(result.providerId).toBe("tavily");
    expect(result.usedLiveSearch).toBe(true);
    expect(result.sources.some((s) => s.uri.includes("example.com/t"))).toBe(true);
  });

  it("falls back from Tavily to Serper when Tavily fails", async () => {
    process.env.TAVILY_API_KEY = "tavily-key";
    process.env.SERPER_API_KEY = "serper-key";
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("tavily.com")) {
        return {
          ok: false,
          status: 503,
          text: async () => "unavailable",
        };
      }
      if (url.includes("serper")) {
        return {
          ok: true,
          json: async () => ({
            organic: [{ title: "Serper hit", link: "https://example.com/s", snippet: "s" }],
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
        text: async () => "<html><title>S</title><body><p>Fallback</p></body></html>",
      };
    });

    const result = await runWebResearch({ query: "compare sources https://example.com/s" });
    expect(result.providerId).toBe("serper");
    expect(result.warnings.some((w) => w.includes("tavily failed"))).toBe(true);
    expect(result.usedLiveSearch).toBe(true);
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

describe("newsEvidenceWithGrounding", () => {
  it("keeps Gemini grounding sources when dedicated search returned nothing", () => {
    const result = newsEvidenceWithGrounding({
      query: "What is happening in Ghana",
      capability: "ghana_news",
      existing: null,
      researchSources: [],
      groundingSources: [
        { title: "Cedi update", uri: "https://www.myjoyonline.com/cedi" },
      ],
    });

    expect(result.evidence?.retrievalFailed).toBe(false);
    expect(result.evidence?.contract.evidenceCount).toBeGreaterThan(0);
    expect(result.sources[0]?.uri).toContain("myjoyonline.com");
    expect(result.evidence?.contract.stories[0]?.headline).toBe("Cedi update");
  });
});
