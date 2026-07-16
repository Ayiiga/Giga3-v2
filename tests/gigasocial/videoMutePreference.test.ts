import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  persistVideoMutedPreference,
  readVideoMutedPreference,
} from "@/lib/gigasocial/videoMutePreference";

describe("videoMutePreference", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });
  });

  it("defaults to unmuted", () => {
    expect(readVideoMutedPreference()).toBe(false);
  });

  it("persists user mute choice for the session", () => {
    persistVideoMutedPreference(true);
    expect(readVideoMutedPreference()).toBe(true);

    persistVideoMutedPreference(false);
    expect(readVideoMutedPreference()).toBe(false);
  });
});
