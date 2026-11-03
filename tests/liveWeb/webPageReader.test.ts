import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { setAddressResolverForTests } from "../../convex/liveWeb/safePublicFetch";
import { createFetchPageReader } from "../../convex/liveWeb/webPageReader";

describe("webPageReader", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    setAddressResolverForTests(async () => ["93.184.216.34"]);
    process.env.GIGA3_LIVE_WEB_ENABLED = "true";
  });

  afterEach(() => {
    setAddressResolverForTests(null);
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

  it("extracts publication dates only from explicit page metadata", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html; charset=utf-8" },
      body: null,
      text: async () =>
        '<html><head><title>Sample Page</title><meta property="article:published_time" content="2026-04-24T10:00:00Z"></head><body><p>Public content here.</p></body></html>',
    });

    const reader = createFetchPageReader();
    const page = await reader.read("https://example.com/2023/03/page", {
      timeoutMs: 5000,
      maxBytes: 50_000,
    });

    expect(page.publishedAt).toBe("2026-04-24T10:00:00Z");
  });

  it("extracts publication dates when meta attributes are in a different order", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html; charset=utf-8" },
      body: null,
      text: async () =>
        '<html><head><title>Sample Page</title><meta content="2026-04-24T10:00:00Z" property="article:published_time"></head><body><p>Public content here.</p></body></html>',
    });

    const reader = createFetchPageReader();
    const page = await reader.read("https://example.com/page", {
      timeoutMs: 5000,
      maxBytes: 50_000,
    });

    expect(page.publishedAt).toBe("2026-04-24T10:00:00Z");
  });

  it("supports spaced itemprop metadata and top-level JSON-LD arrays", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html; charset=utf-8" },
      body: null,
      text: async () => '<html><head><meta itemprop = "datePublished" content = "2026-05-01"><script type="application/ld+json">[{"@type":"Article","datePublished":"2026-05-02"}]</script></head><body><p>Public content here.</p></body></html>',
    });
    const page = await createFetchPageReader().read("https://example.com/page", { timeoutMs: 5000, maxBytes: 50000 });
    expect(page.publishedAt).toBe("2026-05-01");
  });

  it("recognizes oversized PDFs before applying the text response limit", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === "content-type" ? "application/pdf" : name === "content-length" ? "90000000" : null },
      body: null,
      text: vi.fn(async () => "%PDF-1.7"),
    });
    await expect(createFetchPageReader().read("https://example.com/large.pdf", { timeoutMs: 5000, maxBytes: 1000 }))
      .rejects.toThrow(/PDF detected.*not extracted/i);
    expect((fetch as ReturnType<typeof vi.fn>).mock.results[0].value).toBeDefined();
  });

  it("does not infer publication dates from URL paths", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html; charset=utf-8" },
      body: null,
      text: async () =>
        "<html><head><title>Sample Page</title></head><body><p>Public content here.</p></body></html>",
    });

    const reader = createFetchPageReader();
    const page = await reader.read("https://example.com/2023/03/page", {
      timeoutMs: 5000,
      maxBytes: 50_000,
    });

    expect(page.publishedAt).toBeUndefined();
  });

  it("does not claim PDF contents were extracted", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => "application/pdf" },
      body: null,
      text: async () => "%PDF-1.7",
    });

    const reader = createFetchPageReader();
    await expect(
      reader.read("https://example.com/strategy.pdf", { timeoutMs: 5000, maxBytes: 50_000 })
    ).rejects.toThrow(/PDF detected.*not extracted/i);
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
