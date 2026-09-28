import { afterEach, describe, expect, it, vi } from "vitest";
import {
  browseAuditTarget,
  browseMany,
  browseUrl,
} from "../../convex/browse";
import { isBlockedIpAddress } from "../../convex/liveWeb/browsePolicy";
import { setAddressResolverForTests } from "../../convex/liveWeb/safePublicFetch";

const PUBLIC_IP = "93.184.216.34";

function htmlResponse(body: string, status = 200, headers: Record<string, string> = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    body: null,
    text: async () => body,
  };
}

describe("browse address policy", () => {
  afterEach(() => {
    setAddressResolverForTests(null);
    vi.unstubAllGlobals();
  });

  it("rejects private, link-local, metadata, and non-http addresses before fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setAddressResolverForTests(async () => [PUBLIC_IP]);
    for (const url of [
      "http://localhost/admin",
      "http://127.0.0.1/",
      "http://10.1.2.3/",
      "http://172.16.0.4/",
      "http://192.168.1.20/",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]/",
      "http://[fd00::1]/",
      "file:///etc/passwd",
      "ftp://example.com/file",
      "javascript:alert(1)",
      "https://www.giga3ai.com/admin",
      "https://www.giga3ai.com/api/internal",
    ]) {
      const result = await browseUrl(url);
      expect(result.ok).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a public page that redirects to a private address", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("example.com")) {
        return htmlResponse("", 302, { location: "http://127.0.0.1/secret" });
      }
      return htmlResponse("should not be read");
    });
    vi.stubGlobal("fetch", fetchMock);
    setAddressResolverForTests(async (hostname) => {
      if (hostname === "example.com") return [PUBLIC_IP];
      return ["127.0.0.1"];
    });
    const result = await browseUrl("https://example.com/start");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/redirect/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("127.0.0.1");
  });

  it("fetches a public page and keeps a bad URL from failing the rest of a batch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        htmlResponse("<html><title>Example</title><p>Hello from the public web.</p></html>", 200, {
          "content-type": "text/html",
        })
      )
    );
    setAddressResolverForTests(async () => [PUBLIC_IP]);
    const single = await browseUrl("https://example.com/hello");
    expect(single.ok).toBe(true);
    if (single.ok) {
      expect(single.source).toBe("webpage");
      expect(single.text).toContain("Hello from the public web");
      expect(single.note).toMatch(/not written by Giga3/);
    }
    const batch = await browseMany(["http://127.0.0.1/", "https://example.com/hello"]);
    expect(batch.ok).toBe(true);
    expect(batch.results[0]?.ok).toBe(false);
    expect(batch.results[1]?.ok).toBe(true);
  });

  it("rejects oversized bodies and more than 10 urls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => htmlResponse("x".repeat(20), 200, { "content-type": "text/plain", "content-length": "9999999" }))
    );
    setAddressResolverForTests(async () => [PUBLIC_IP]);
    const huge = await browseUrl("https://example.com/huge");
    expect(huge.ok).toBe(false);
    if (!huge.ok) expect(huge.error).toMatch(/too large/i);
    const tooMany = await browseMany(Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`));
    expect(tooMany.ok).toBe(false);
  });

  it("blocks private addresses by the resolved IP, not only the hostname", () => {
    expect(isBlockedIpAddress("10.0.0.8")).toBe(true);
    expect(isBlockedIpAddress("fe80::1")).toBe(true);
    expect(isBlockedIpAddress("::ffff:169.254.169.254")).toBe(true);
    expect(isBlockedIpAddress("93.184.216.34")).toBe(false);
  });

  it("limits self-audit to public Giga3 routes", () => {
    expect(browseAuditTarget("/gigalearn/")).toBe("https://www.giga3ai.com/gigalearn/");
    expect(browseAuditTarget("/admin")).toBeNull();
    expect(browseAuditTarget("/api/")).toBeNull();
    expect(browseAuditTarget("/wallet/")).toBeNull();
  });
});
