import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(__dirname, "../../web/public/offline.html"), "utf8");
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error("offline.html runtime script missing");

type FakeTimer = { callback: () => void; delay: number };
type FakeElement = {
  textContent: string;
  className: string;
  style: { display: string };
  addEventListener: (name: string, listener: () => void) => void;
};

function runOfflinePage(
  online: boolean,
  fetchImplementation: (url: string, options: RequestInit) => Promise<Response>,
  hasCachedHome = false
) {
  const timers = new Map<number, FakeTimer>();
  const listeners = new Map<string, () => void>();
  const buttons = new Map<string, () => void>();
  const elements = new Map<string, FakeElement>();
  const requests: string[] = [];
  const replacements: string[] = [];
  let timerId = 0;
  let reloads = 0;
  const navigatorState = { onLine: online };
  const location = {
    pathname: "/offline.html",
    replace: (path: string) => replacements.push(path),
    reload: () => { reloads++; },
  };
  const getElement = (id: string) => {
    if (!elements.has(id)) {
      elements.set(id, {
        textContent: "",
        className: "",
        style: { display: "none" },
        addEventListener: (name, listener) => buttons.set(id + ":" + name, listener),
      });
    }
    return elements.get(id)!;
  };
  const caches = {
    match: async () => hasCachedHome ? new Response("<html>Cached home</html>") : undefined,
  };
  const context = {
    window: { caches, addEventListener: (name: string, callback: () => void) => listeners.set(name, callback) },
    caches,
    navigator: navigatorState,
    location,
    document: { getElementById: getElement },
    AbortController,
    Date,
    setTimeout: (callback: () => void, delay: number) => {
      const id = ++timerId;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout: (id: number) => timers.delete(id),
    fetch: (url: string, options: RequestInit) => {
      requests.push(url);
      return fetchImplementation(url, options);
    },
  };
  runInNewContext(script, context, { timeout: 2000 });
  const fireTimer = (delay: number) => {
    const entry = [...timers.entries()].find(([, value]) => value.delay === delay);
    if (!entry) throw new Error("Expected timer not found: " + delay);
    timers.delete(entry[0]);
    entry[1].callback();
  };
  return {
    requests,
    replacements,
    get reloads() { return reloads; },
    getElement,
    navigatorState,
    timers,
    fireTimer,
    listener: (name: string) => listeners.get(name)!,
    retry: () => buttons.get("retry:click")!(),
  };
}

async function flushPromises() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

describe("offline page recovery under mobile connectivity changes", () => {
  it("uses the uncached homepage probe and recovers when HTML is reachable", async () => {
    const page = runOfflinePage(true, async () =>
      new Response("<html>Giga3</html>", { headers: { "Content-Type": "text/html; charset=utf-8" } })
    );
    await flushPromises();
    expect(page.requests).toHaveLength(1);
    expect(page.requests[0]).toMatch(/^\/\?__giga3_connectivity_probe=\d+$/);
    expect(page.getElement("status-text").textContent).toBe("Back online");
    page.fireTimer(350);
    expect(page.replacements).toEqual(["/"]);
  });

  it("labels an unreachable site a connection issue rather than device offline", async () => {
    const page = runOfflinePage(true, async () => { throw new Error("network failure"); }, true);
    await flushPromises();
    expect(page.getElement("status-text").textContent).toBe("Connection issue");
    expect(page.getElement("cached").style.display).toBe("block");
    expect([...page.timers.values()].some((timer) => timer.delay === 10000)).toBe(true);
    expect(page.replacements).toEqual([]);
    expect(page.reloads).toBe(0);
  });

  it("shows offline mode and retries even if Android misses an online event", async () => {
    const page = runOfflinePage(false, async () => { throw new Error("should not fetch"); });
    expect(page.getElement("status-text").textContent).toBe("You're offline");
    expect(page.requests).toHaveLength(0);
    page.navigatorState.onLine = true;
    page.fireTimer(10000);
    await flushPromises();
    expect(page.requests).toHaveLength(1);
    expect(page.getElement("status-text").textContent).toBe("Connection issue");
  });

  it("does not treat a successful JSON or server error response as healthy HTML", async () => {
    for (const response of [
      new Response('{"error":"offline"}', { headers: { "Content-Type": "application/json" } }),
      new Response("<html>Gateway down</html>", { status: 503, headers: { "Content-Type": "text/html" } }),
    ]) {
      const page = runOfflinePage(true, async () => response);
      await flushPromises();
      expect(page.getElement("status-text").textContent).toBe("Connection issue");
      expect(page.replacements).toEqual([]);
    }
  });

  it("does not reload on a stale success arriving after an offline event", async () => {
    let completeFetch!: (response: Response) => void;
    const page = runOfflinePage(true, () => new Promise<Response>((resolve) => { completeFetch = resolve; }));
    page.navigatorState.onLine = false;
    page.listener("offline")();
    completeFetch(new Response("<html>Old response</html>", { headers: { "Content-Type": "text/html" } }));
    await flushPromises();
    expect(page.getElement("status-text").textContent).toBe("You're offline");
    expect(page.replacements).toEqual([]);
    expect([...page.timers.values()].some((timer) => timer.delay === 10000)).toBe(true);
  });

  it("does not misclassify a pending slow 3G response before its 12-second timeout", async () => {
    const page = runOfflinePage(true, (_url, options) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error("timeout")));
    }));
    expect(page.getElement("status-text").textContent).toBe("Checking connection…");
    expect([...page.timers.values()].some((timer) => timer.delay === 12000)).toBe(true);
    page.fireTimer(12000);
    await flushPromises();
    expect(page.getElement("status-text").textContent).toBe("Connection issue");
    expect([...page.timers.values()].some((timer) => timer.delay === 10000)).toBe(true);
  });

  it("accepts manual retry without stacking parallel requests", async () => {
    const page = runOfflinePage(true, async () => { throw new Error("temporary failure"); });
    await flushPromises();
    expect(page.requests).toHaveLength(1);
    page.retry();
    await flushPromises();
    expect(page.requests).toHaveLength(2);
    expect([...page.timers.values()].filter((timer) => timer.delay === 10000)).toHaveLength(1);
  });
});
