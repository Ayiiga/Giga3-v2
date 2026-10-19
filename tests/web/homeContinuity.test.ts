import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildHomeGreeting,
  greetingNameFromEmail,
  homeQuickActionStarter,
  HOME_DESTINATIONS,
  listSyncHomeResumeItems,
  listUserSavedPrompts,
} from "../../web/lib/chat/homeContinuity";

describe("homeContinuity", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    // Minimal localStorage for node vitest
    // @ts-expect-error test shim
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    // @ts-expect-error test shim
    globalThis.window = globalThis;
  });

  afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.localStorage;
    // @ts-expect-error cleanup
    delete globalThis.window;
  });

  it("derives a first-name style greeting from email local-part", () => {
    expect(greetingNameFromEmail("ama.mensah@example.com")).toBe("Ama");
    expect(greetingNameFromEmail(null)).toBeNull();
    expect(greetingNameFromEmail("bad")).toBeNull();
  });

  it("builds time-aware greeting without inventing stats", () => {
    const morning = buildHomeGreeting({ email: "kojo@giga3.ai", hour: 9 });
    expect(morning.title).toContain("Good morning");
    expect(morning.title).toContain("Kojo");
    expect(morning.subtitle.toLowerCase()).toMatch(/ask|left off/);

    const anon = buildHomeGreeting({ email: null, hour: 20 });
    expect(anon.title).toBe("Good evening");
  });

  it("exposes five destinations including Chat as home", () => {
    expect(HOME_DESTINATIONS.map((d) => d.id)).toEqual([
      "home",
      "learn",
      "create",
      "social",
      "market",
    ]);
    expect(HOME_DESTINATIONS[0].href).toBe("/chat");
  });

  it("returns starter prompts for quick actions", () => {
    expect(homeQuickActionStarter("learn")).toMatch(/learn/i);
    expect(homeQuickActionStarter("code")).toMatch(/code/i);
  });

  it("lists user-saved prompts only when createdAt > 0", () => {
    store.set(
      "giga3_saved_prompts",
      JSON.stringify([
        { id: "default", title: "Default", body: "x", createdAt: 0 },
        { id: "mine", title: "My prompt", body: "Help me…", createdAt: 100 },
      ])
    );
    const saved = listUserSavedPrompts();
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe("mine");
  });

  it("surfaces unfinished practice sessions as resume items", () => {
    store.set(
      "giga3_gigalearn_practice_session",
      JSON.stringify({
        toolId: "math-quiz",
        mode: "practice",
        level: "jhs",
        questions: [{ id: "1" }, { id: "2" }],
        index: 0,
        answers: { "1": "a" },
        results: {},
        startedAt: 1,
        updatedAt: 2,
      })
    );
    const items = listSyncHomeResumeItems();
    expect(items.some((i) => i.kind === "learn" && i.href === "/gigalearn")).toBe(true);
  });
});
