import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("attentionDot 24h soft indicator", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("window", globalThis);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows attention when never opened, then clears after recordAppOpen", async () => {
    const {
      shouldShowAttentionDot,
      recordAppOpen,
      attentionBadgeFloor,
      ATTENTION_INACTIVE_MS,
    } = await import("../../web/lib/pwa/attentionDot");

    expect(shouldShowAttentionDot()).toBe(true);
    expect(attentionBadgeFloor(0)).toBe(1);
    expect(attentionBadgeFloor(3)).toBe(3);

    const now = Date.now();
    recordAppOpen(now);
    expect(shouldShowAttentionDot(now + 1000)).toBe(false);
    expect(shouldShowAttentionDot(now + ATTENTION_INACTIVE_MS + 1)).toBe(true);
  });
});
