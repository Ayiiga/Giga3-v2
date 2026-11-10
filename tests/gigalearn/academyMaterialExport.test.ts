import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "../../web/functions/api/academy-material.js";

function request(action: string, course = "robotics", token: string | null = "session-token") {
  return onRequestPost({
    env: {},
    request: new Request("https://www.giga3ai.com/api/academy-material", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, course }),
    }),
  });
}

function mockSubscription(value: unknown) {
  const fetch = vi.fn().mockImplementation(async () => Response.json({ status: "success", value }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe("Academy worksheet export", () => {
  it("rejects anonymous or invalid course requests without calling billing", async () => {
    const fetch = mockSubscription(null);
    expect((await request("download", "robotics", null)).status).toBe(401);
    expect((await request("download", "other")).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { status: "cancelled", periodEnd: Date.now() + 60_000 },
    { status: "active", periodEnd: Date.now() - 60_000 },
  ])("denies exports without a current active subscription (%j)", async (subscription) => {
    mockSubscription(subscription);
    for (const action of ["access", "download", "print"]) {
      const response = await request(action);
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("");
    }
  });

  it("checks the signed-in session for each export and only returns the selected worksheet", async () => {
    const fetch = mockSubscription({ status: "active", periodEnd: Date.now() + 60_000 });
    expect((await request("access")).status).toBe(204);
    const download = await request("download");
    const print = await request("print");
    expect(download.status).toBe(200);
    expect(download.headers.get("Content-Disposition")).toContain("gigalearn-robotics-worksheet.txt");
    expect(print.status).toBe(200);
    expect(print.headers.get("Cache-Control")).toBe("private, no-store");
    const worksheet = await print.text();
    expect(worksheet).toContain("Sensor and actuator experiment sheet");
    expect(worksheet).not.toContain("Digital workspace starter worksheet");
    expect(fetch).toHaveBeenCalledTimes(3);
    for (const [, options] of fetch.mock.calls) {
      expect(JSON.parse(options.body)).toMatchObject({
        path: "subscriptions:getActiveSubscription",
        args: [{ sessionToken: "session-token" }],
      });
    }
  });

  it("fails closed when subscription verification is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
    const response = await request("download");
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
  });
});
