import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

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

describe("client auth helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("sessionStorage", createStorage());
    vi.stubGlobal("window", globalThis);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates email shape", async () => {
    const { isValidEmail } = await import("../../web/lib/auth");
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("persists session email and token", async () => {
    const { setAuthSession, getUserEmail, getSessionToken } = await import(
      "../../web/lib/auth"
    );
    setAuthSession("User@Example.com", "token-abc");
    expect(getUserEmail()).toBe("user@example.com");
    expect(getSessionToken()).toBe("token-abc");
  });

  it("clears all client auth artifacts on logout", async () => {
    const { setAuthSession, clearAllClientAuth, getUserEmail, getSessionToken } =
      await import("../../web/lib/auth");
    setAuthSession("user@example.com", "token-abc");
    localStorage.setItem("giga3_supabase_access_token", "supa");
    sessionStorage.setItem("giga3_admin_session", "admin");
    clearAllClientAuth();
    expect(getUserEmail()).toBeNull();
    expect(getSessionToken()).toBeNull();
    expect(localStorage.getItem("giga3_supabase_access_token")).toBeNull();
    expect(sessionStorage.getItem("giga3_admin_session")).toBeNull();
  });
});
