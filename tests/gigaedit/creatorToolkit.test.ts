import { describe, expect, it, vi } from "vitest";
import {
  buildCreatorToolkitItems,
  isTeleprompterPinned,
  setTeleprompterPinned,
  TOOLKIT_PRIORITY_IDS,
} from "../../web/lib/gigaedit/creatorToolkit";
import { deduplicateGigaEditProjects } from "../../web/lib/gigaedit/projects";
import type { GigaEditProjectRecord } from "../../web/lib/gigaedit/projects";

describe("creator toolkit ordering", () => {
  it("puts teleprompter and record voice first when pinned", () => {
    const items = buildCreatorToolkitItems("all", true);
    const ids = items.map((item) =>
      item.kind === "action" ? item.action.id : item.tool.id
    );
    expect(ids[0]).toBe("teleprompter");
    expect(ids[1]).toBe("record-voice");
    expect(ids[2]).toBe("ai-photo-editor");
    expect(ids[3]).toBe("ai-video-editor");
  });

  it("persists teleprompter pin preference", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });

    setTeleprompterPinned(false);
    expect(isTeleprompterPinned()).toBe(false);
    setTeleprompterPinned(true);
    expect(isTeleprompterPinned()).toBe(true);
    vi.unstubAllGlobals();
  });

  it("defines voiceover priority ids", () => {
    expect(TOOLKIT_PRIORITY_IDS).toContain("teleprompter");
    expect(TOOLKIT_PRIORITY_IDS).toContain("record-voice");
  });
});

describe("project deduplication", () => {
  it("keeps the latest updatedAt row per id", () => {
    const base: GigaEditProjectRecord = {
      id: "1001144701",
      title: "Hands rope take",
      kind: "video",
      status: "draft",
      createdAt: 1,
      updatedAt: 100,
      aspectRatio: "9:16",
      aiAssisted: false,
      hasOriginal: true,
      offlineReady: true,
      clips: [],
    };
    const older = { ...base, updatedAt: 100, title: "Old" };
    const newer = { ...base, updatedAt: 500, title: "Latest" };
    const duplicate = { ...base, updatedAt: 200, title: "Mid" };

    const result = deduplicateGigaEditProjects([older, newer, duplicate]);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Latest");
    expect(result[0]?.updatedAt).toBe(500);
  });
});
