import { describe, expect, it, vi } from "vitest";
import {
  consumeCreatorComposeHandoff,
  stageCreatorComposeHandoff,
} from "../../web/lib/creator-studio/composeHandoff";

describe("creator compose handoff", () => {
  function mockSessionStorage() {
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  }

  it("stages and consumes draft body once", () => {
    mockSessionStorage();

    stageCreatorComposeHandoff("Hello from Creator Studio");
    expect(consumeCreatorComposeHandoff()).toEqual({
      body: "Hello from Creator Studio",
      kind: "social",
    });
    expect(consumeCreatorComposeHandoff()).toBeNull();

    vi.unstubAllGlobals();
  });

  it("marks blog drafts for education posts with a higher limit", () => {
    mockSessionStorage();

    stageCreatorComposeHandoff("Long blog draft", "blog");
    expect(consumeCreatorComposeHandoff()).toEqual({
      body: "Long blog draft",
      kind: "blog",
    });

    vi.unstubAllGlobals();
  });
});
