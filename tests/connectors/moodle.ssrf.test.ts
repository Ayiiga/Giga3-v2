import { describe, expect, it, vi } from "vitest";
import {
  isBlockedHostname,
  normalizeSiteUrl,
  verifyMoodleToken,
  MOODLE_MAX_RESPONSE_BYTES,
} from "../../convex/connectors/providers/moodle";

describe("Moodle SSRF and fetch hardening", () => {
  it("rejects http and credentialed URLs", () => {
    expect(() => normalizeSiteUrl("http://moodle.example.edu")).toThrow(/https/);
    expect(() => normalizeSiteUrl("https://user:pass@moodle.example.edu")).toThrow(
      /credentials/
    );
  });

  it("blocks localhost and private IPv4 addresses", () => {
    for (const host of [
      "localhost",
      "127.0.0.1",
      "10.0.0.5",
      "192.168.1.1",
      "172.16.0.1",
      "169.254.169.254",
      "100.64.1.1",
      "0.0.0.0",
      "2130706433",
    ]) {
      expect(isBlockedHostname(host)).toBe(true);
      expect(() => normalizeSiteUrl(`https://${host}/moodle`)).toThrow(/not allowed/);
    }
  });

  it("blocks IPv6 loopback and private literals", () => {
    for (const host of ["::1", "[::1]", "fe80::1", "fc00::1", "fd12::1"]) {
      expect(isBlockedHostname(host.replace(/^\[|\]$/g, "")) || isBlockedHostname(host)).toBe(
        true
      );
    }
    expect(() => normalizeSiteUrl("https://[::1]/moodle")).toThrow();
  });

  it("allows public https hostnames", () => {
    expect(normalizeSiteUrl("https://moodle.example.edu/path/")).toBe(
      "https://moodle.example.edu/path"
    );
  });

  it("uses redirect:manual and rejects 302/303/307/308 without following", async () => {
    for (const status of [302, 303, 307, 308]) {
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        expect(init?.redirect).toBe("manual");
        return new Response(null, {
          status,
          headers: { Location: "https://evil.example/steal" },
        });
      }) as unknown as typeof fetch;

      await expect(
        verifyMoodleToken("https://moodle.example.edu", "secret-token", fetchImpl)
      ).rejects.toThrow(/redirect/i);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it("does not follow redirects (single fetch call)", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return new Response(null, {
        status: 302,
        headers: { Location: "https://127.0.0.1/metadata" },
      });
    }) as unknown as typeof fetch;

    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token-abc", fetchImpl)
    ).rejects.toThrow(/redirect/i);
    expect(calls).toBe(1);
  });

  it("rejects oversized Content-Length before reading body", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("{}", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(MOODLE_MAX_RESPONSE_BYTES + 1),
        },
      });
    }) as unknown as typeof fetch;

    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token", fetchImpl)
    ).rejects.toThrow(/too large/i);
  });

  it("rejects oversized response bodies by actual bytes", async () => {
    const big = "x".repeat(MOODLE_MAX_RESPONSE_BYTES + 50);
    const fetchImpl = vi.fn(async () => {
      return new Response(big, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token", fetchImpl)
    ).rejects.toThrow(/too large/i);
  });

  it("returns a safe generic error for invalid JSON", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("not-json{{{", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await expect(
      verifyMoodleToken("https://moodle.example.edu", "super-secret-token", fetchImpl)
    ).rejects.toThrow(/invalid response/i);

    try {
      await verifyMoodleToken("https://moodle.example.edu", "super-secret-token", fetchImpl);
    } catch (e) {
      expect(String(e)).not.toContain("super-secret-token");
    }
  });

  it("parses successful Moodle JSON responses", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.redirect).toBe("manual");
      return new Response(
        JSON.stringify({ sitename: "Campus LMS", username: "student", userid: 3 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token-value-123456", fetchImpl)
    ).resolves.toMatchObject({ siteName: "Campus LMS", userId: 3 });
  });
});
