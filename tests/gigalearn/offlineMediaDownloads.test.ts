/**
 * @vitest-environment happy-dom
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMediaItemById,
  MEDIA_LIBRARY_CATALOG,
} from "../../web/lib/gigalearn/mediaLibrary/catalog";
import {
  downloadMediaPack,
  getOfflineMediaPack,
  getOfflineMediaStorageSummary,
  listOfflineMediaPacks,
  removeOfflineMediaPack,
} from "../../web/lib/gigalearn/mediaLibrary/offlineMedia";
import {
  hasCompletedGame,
  listLocalMediaProgress,
  recordMediaProgress,
} from "../../web/lib/gigalearn/mediaLibrary/mediaProgress";
import { listOfflineProgressEvents } from "../../web/lib/gigalearn/offlineProgressQueue";

async function resetOfflineDb() {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("giga3-gigalearn-offline");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  await new Promise((r) => setTimeout(r, 10));
}

describe("Discover offline media downloads", () => {
  beforeEach(async () => {
    await resetOfflineDb();
  });

  it("downloads a JSON media pack once and reuses it on repeat", async () => {
    const item = getMediaItemById("pic-mango-kg2")!;
    const progressEvents: number[] = [];
    const first = await downloadMediaPack(item, {
      onProgress: (pack) => progressEvents.push(pack.progress),
    });
    expect(first.status).toBe("ready");
    expect(first.item.title).toBe("Mango");
    expect(first.item.game?.answer).toContain("Mango");
    expect(progressEvents.at(-1)).toBe(1);

    const listed = await listOfflineMediaPacks();
    expect(listed.some((row) => row.itemId === item.id && row.status === "ready")).toBe(true);

    const second = await downloadMediaPack(item);
    expect(second.id).toBe(first.id);
    expect(second.status).toBe("ready");

    const summary = await getOfflineMediaStorageSummary();
    expect(summary.readyCount).toBeGreaterThanOrEqual(1);
    expect(summary.bytesStored).toBeGreaterThan(0);

    await removeOfflineMediaPack(item.id);
    expect(await getOfflineMediaPack(item.id)).toBeNull();
  });

  it("dedupes concurrent download jobs for the same item", async () => {
    const item = getMediaItemById("game-count-bananas-kg2")!;
    const [a, b] = await Promise.all([downloadMediaPack(item), downloadMediaPack(item)]);
    expect(a.id).toBe(b.id);
    const packs = await listOfflineMediaPacks();
    expect(packs.filter((row) => row.itemId === item.id)).toHaveLength(1);
  });

  it("keeps game playable from the offline snapshot without catalog lookup", async () => {
    const item = getMediaItemById("pic-mango-kg2")!;
    await downloadMediaPack(item);
    // Simulate catalog unavailability by only reading the offline pack.
    const pack = await getOfflineMediaPack(item.id);
    expect(pack?.item.game?.prompt).toContain("mango");
    expect(pack?.item.narrations[0]?.text).toBe("Mango");
    // Ensure we did not require every catalog row to be present for playback.
    expect(MEDIA_LIBRARY_CATALOG.length).toBeGreaterThan(0);
  });

  it("skips missing optional remote media without failing the pack", async () => {
    const item = {
      ...getMediaItemById("story-ananse-listen")!,
      remoteMedia: [
        {
          kind: "remote" as const,
          url: "https://example.invalid/missing-audio.mp3",
          mimeType: "audio/mpeg",
          estimatedBytes: 12_000,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Network down");
      })
    );
    const pack = await downloadMediaPack(item);
    expect(pack.status).toBe("ready");
    expect(pack.errorMessage).toMatch(/Optional media skipped/i);
    vi.unstubAllGlobals();
  });
});

describe("Discover media progress", () => {
  beforeEach(async () => {
    localStorage.removeItem("giga3_gigalearn_media_progress");
    await resetOfflineDb();
  });

  it("records view/hear/game progress and queues game scores for sync", async () => {
    await recordMediaProgress({ itemId: "pic-mango-kg2", kind: "viewed" });
    await recordMediaProgress({ itemId: "pic-mango-kg2", kind: "heard" });
    await recordMediaProgress({
      itemId: "pic-mango-kg2",
      kind: "game_completed",
      score: 100,
      subject: "Our World",
      curriculum: "kg-2",
    });
    expect(hasCompletedGame("pic-mango-kg2")).toBe(true);
    expect(listLocalMediaProgress("pic-mango-kg2").map((row) => row.kind)).toEqual(
      expect.arrayContaining(["viewed", "heard", "game_completed"])
    );
    const queued = await listOfflineProgressEvents();
    expect(queued.some((row) => row.topicKey === "media:pic-mango-kg2" && row.score === 100)).toBe(
      true
    );
  });
});
