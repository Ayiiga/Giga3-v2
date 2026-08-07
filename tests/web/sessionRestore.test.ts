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

describe("session restore + workspace persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("sessionStorage", createStorage());
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("navigator", { onLine: true });
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects persisted auth without flashing guest", async () => {
    const { setAuthSession } = await import("../../web/lib/auth");
    const { hasPersistedAuth, hasPersistedSessionToken } = await import(
      "../../web/lib/auth/sessionRestore"
    );
    expect(hasPersistedAuth()).toBe(false);
    setAuthSession("user@example.com", "token-xyz");
    expect(hasPersistedSessionToken()).toBe(true);
    expect(hasPersistedAuth()).toBe(true);
  });

  it("keeps offline cached session when recovery runs offline", async () => {
    const { setAuthSession } = await import("../../web/lib/auth");
    const { recoverInvalidSession } = await import("../../web/lib/auth/sessionRestore");
    setAuthSession("user@example.com", "token-offline");
    const result = await recoverInvalidSession({
      online: false,
      bootstrapSession: async () => null,
    });
    expect(result.status).toBe("offline_cached");
    if (result.status !== "unauthenticated") {
      expect(result.sessionToken).toBe("token-offline");
    }
  });

  it("bootstraps a refreshed session from email when online", async () => {
    const { setUserEmail, getSessionToken } = await import("../../web/lib/auth");
    const { recoverInvalidSession } = await import("../../web/lib/auth/sessionRestore");
    setUserEmail("user@example.com");
    const result = await recoverInvalidSession({
      online: true,
      bootstrapSession: async (email) => {
        expect(email).toBe("user@example.com");
        return "fresh-token";
      },
    });
    expect(result.status).toBe("refreshed");
    expect(getSessionToken()).toBe("fresh-token");
  });

  it("persists composer drafts and active conversation", async () => {
    const { writeComposerDraft, readComposerDraft, clearComposerDraft } = await import(
      "../../web/lib/chat/composerDraft"
    );
    const {
      writeActiveConversationId,
      readActiveConversationId,
      writeSidebarCollapsed,
      readSidebarCollapsed,
    } = await import("../../web/lib/chat/workspacePersist");

    writeComposerDraft("c1", "hello draft");
    expect(readComposerDraft("c1")).toBe("hello draft");
    clearComposerDraft("c1");
    expect(readComposerDraft("c1")).toBe("");

    writeActiveConversationId("conv-9");
    expect(readActiveConversationId()).toBe("conv-9");
    writeSidebarCollapsed(true);
    expect(readSidebarCollapsed()).toBe(true);
  });
});
