import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isBlockedHostname,
  isProhibitedMoodleDestinationIp,
  normalizeSiteUrl,
  setMoodleAddressResolverForTests,
  setMoodleTransportForTests,
  verifyMoodleToken,
  MOODLE_MAX_RESPONSE_BYTES,
  type MoodleTransportRequest,
} from "../../convex/connectors/providers/moodle";

const PUBLIC_IP = "93.184.216.34";

function transportFrom(
  handler: (req: MoodleTransportRequest) => {
    status: number;
    headers?: Record<string, string | undefined>;
    body: string;
  }
) {
  return async (req: MoodleTransportRequest) => {
    const res = handler(req);
    return {
      status: res.status,
      headers: res.headers ?? {},
      body: res.body,
    };
  };
}

describe("Moodle SSRF and fetch hardening", () => {
  afterEach(() => {
    setMoodleAddressResolverForTests(null);
    setMoodleTransportForTests(null);
  });

  it("rejects http and credentialed URLs", () => {
    expect(() => normalizeSiteUrl("http://moodle.example.edu")).toThrow(/https/);
    expect(() => normalizeSiteUrl("https://user:pass@moodle.example.edu")).toThrow(
      /username|password|credentials/i
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

  it("accepts bare hostnames by assuming https and trims whitespace", () => {
    expect(normalizeSiteUrl("  moodle.example.edu/moodle/  ")).toBe(
      "https://moodle.example.edu/moodle"
    );
  });

  it("rejects hostile DNS that resolves to private / link-local / metadata IPs", async () => {
    const transport = vi.fn();
    setMoodleTransportForTests(transport);
    for (const ip of ["127.0.0.1", "10.0.0.9", "169.254.169.254", "192.168.0.2", "::1", "fe80::1"]) {
      setMoodleAddressResolverForTests(async () => [ip]);
      await expect(
        verifyMoodleToken("https://moodle.example.edu", "token-value-123456")
      ).rejects.toThrow(/destination is not allowed/i);
    }
    expect(transport).not.toHaveBeenCalled();
  });

  it("rejects when any resolved address is prohibited (mixed A/AAAA)", async () => {
    const transport = vi.fn();
    setMoodleTransportForTests(transport);
    setMoodleAddressResolverForTests(async () => [PUBLIC_IP, "10.1.2.3"]);
    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token-value-123456")
    ).rejects.toThrow(/destination is not allowed/i);
    expect(transport).not.toHaveBeenCalled();
  });

  it("pins connectAddress to the resolved public IP", async () => {
    setMoodleAddressResolverForTests(async () => [PUBLIC_IP]);
    const transport = vi.fn(
      transportFrom((req) => {
        expect(req.connectAddress).toBe(PUBLIC_IP);
        expect(req.hostname).toBe("moodle.example.edu");
        return {
          status: 200,
          body: JSON.stringify({ sitename: "Campus", username: "s", userid: 1 }),
        };
      })
    );
    setMoodleTransportForTests(transport);
    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token-value-123456")
    ).resolves.toMatchObject({ siteName: "Campus", userId: 1 });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("rejects 302/303/307/308 without following redirects", async () => {
    setMoodleAddressResolverForTests(async () => [PUBLIC_IP]);
    for (const status of [302, 303, 307, 308]) {
      const transport = vi.fn(
        transportFrom(() => ({
          status,
          headers: { location: "https://127.0.0.1/steal" },
          body: "",
        }))
      );
      setMoodleTransportForTests(transport);
      await expect(
        verifyMoodleToken("https://moodle.example.edu", "secret-token")
      ).rejects.toThrow(/redirect/i);
      expect(transport).toHaveBeenCalledTimes(1);
    }
  });

  it("rejects oversized Content-Length before accepting the body", async () => {
    setMoodleAddressResolverForTests(async () => [PUBLIC_IP]);
    // Mirrors defaultHttpsTransport Content-Length enforcement.
    setMoodleTransportForTests(async (req) => {
      const declared = MOODLE_MAX_RESPONSE_BYTES + 1;
      if (declared > req.maxBytes) throw new Error("Moodle response too large.");
      return { status: 200, headers: {}, body: "{}" };
    });
    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token")
    ).rejects.toThrow(/too large/i);
  });

  it("rejects oversized response bodies by actual bytes", async () => {
    setMoodleAddressResolverForTests(async () => [PUBLIC_IP]);
    setMoodleTransportForTests(async (req) => {
      const big = "x".repeat(req.maxBytes + 50);
      if (big.length > req.maxBytes) throw new Error("Moodle response too large.");
      return { status: 200, headers: {}, body: big };
    });
    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token")
    ).rejects.toThrow(/too large/i);
  });

  it("maps AbortError to a timeout without leaking tokens", async () => {
    setMoodleAddressResolverForTests(async () => [PUBLIC_IP]);
    setMoodleTransportForTests(async () => {
      const err = new Error("The operation was aborted.");
      err.name = "AbortError";
      throw err;
    });
    await expect(
      verifyMoodleToken("https://moodle.example.edu", "super-secret-token")
    ).rejects.toThrow(/timed out/i);
    try {
      await verifyMoodleToken("https://moodle.example.edu", "super-secret-token");
    } catch (e) {
      expect(String(e)).not.toContain("super-secret-token");
    }
  });

  it("returns a safe generic error for invalid JSON", async () => {
    setMoodleAddressResolverForTests(async () => [PUBLIC_IP]);
    setMoodleTransportForTests(
      transportFrom(() => ({ status: 200, body: "not-json{{{" }))
    );
    await expect(
      verifyMoodleToken("https://moodle.example.edu", "super-secret-token")
    ).rejects.toThrow(/invalid response/i);
  });

  it("parses successful Moodle JSON responses", async () => {
    setMoodleAddressResolverForTests(async () => [PUBLIC_IP]);
    setMoodleTransportForTests(
      transportFrom(() => ({
        status: 200,
        body: JSON.stringify({
          sitename: "Campus LMS",
          username: "student",
          userid: 3,
        }),
      }))
    );
    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token-value-123456")
    ).resolves.toMatchObject({ siteName: "Campus LMS", userId: 3 });
  });

  it("flags prohibited destination IPs including CGNAT and multicast", () => {
    expect(isProhibitedMoodleDestinationIp("100.64.1.1")).toBe(true);
    expect(isProhibitedMoodleDestinationIp("224.0.0.1")).toBe(true);
    expect(isProhibitedMoodleDestinationIp(PUBLIC_IP)).toBe(false);
  });
});
