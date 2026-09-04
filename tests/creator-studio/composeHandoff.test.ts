import { describe, expect, it, vi } from "vitest";
import {
  consumeCreatorComposeHandoff,
  stageCreatorComposeHandoff,
} from "../../web/lib/creator-studio/composeHandoff";

describe("creator compose handoff", () => {
  it("stages and consumes draft body once", () => {
    const storage = new Map<string, string>();
    const sessionStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };
    vi.stubGlobal("sessionStorage", sessionStorage);

    stageCreatorComposeHandoff("Hello from Creator Studio");
    expect(consumeCreatorComposeHandoff()).toBe("Hello from Creator Studio");
    expect(consumeCreatorComposeHandoff()).toBeNull();

    vi.unstubAllGlobals();
  });
});
