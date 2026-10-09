/**
 * @vitest-environment happy-dom
 */
import "fake-indexeddb/auto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMediaItemById,
  MEDIA_LIBRARY_CATALOG,
} from "../../web/lib/gigalearn/mediaLibrary/catalog";
import { GHANA_KG2_MEDIA_SLICE_IDS } from "../../web/lib/gigalearn/mediaLibrary/catalog.ghana";
import {
  assertReadyOfflinePack,
  downloadMediaPack,
  getOfflineMediaPack,
  getOfflineMediaStorageSummary,
  isOfflinePackComplete,
  listCompleteOfflineMediaPacks,
  listOfflineMediaPacks,
  removeOfflineMediaPack,
  requiredRemoteAssets,
} from "../../web/lib/gigalearn/mediaLibrary/offlineMedia";
import {
  hasCompletedGame,
  listLocalMediaProgress,
  recordMediaProgress,
} from "../../web/lib/gigalearn/mediaLibrary/mediaProgress";
import {
  flushOfflineProgressQueue,
} from "../../web/lib/gigalearn/offlineProgressSync";
import { listOfflineProgressEvents } from "../../web/lib/gigalearn/offlineProgressQueue";

async function resetOfflineDb() {
  await new Promise<void>((resolveDone) => {
    const req = indexedDB.deleteDatabase("giga3-gigalearn-offline");
    req.onsuccess = () => resolveDone();
    req.onerror = () => resolveDone();
    req.onblocked = () => resolveDone();
  });
  await new Promise((r) => setTimeout(r, 10));
}

function publicFile(url: string): Response {
  const path = url.startsWith("http") ? new URL(url).pathname : url;
  const file = resolve(__dirname, "../../web/public", path.replace(/^\//, ""));
  if (!existsSync(file)) {
    return new Response("missing", { status: 404 });
  }
  const buf = readFileSync(file);
  const mime = file.endsWith(".svg")
    ? "image/svg+xml"
    : file.endsWith(".mp3")
      ? "audio/mpeg"
      : file.endsWith(".mp4")
        ? "video/mp4"
        : "application/octet-stream";
  return new Response(buf, { status: 200, headers: { "Content-Type": mime } });
}

describe("Discover offline media downloads", () => {
  beforeEach(async () => {
    await resetOfflineDb();
    vi.unstubAllGlobals();
  });

  it("downloads a JSON media pack once and reuses it on repeat", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => publicFile(String(input))));
    const item = getMediaItemById("pic-mango-kg2")!;
    const progressEvents: number[] = [];
    const first = await downloadMediaPack(item, {
      onProgress: (pack) => progressEvents.push(pack.progress),
    });
    expect(first.status).toBe("ready");
    expect(isOfflinePackComplete(first)).toBe(true);
    expect(assertReadyOfflinePack(first)).toEqual([]);
    expect(first.item.title).toBe("Mango");
    expect(first.item.game?.answer).toContain("Mango");
    expect(progressEvents.at(-1)).toBe(1);
    expect(Object.keys(first.blobs ?? {}).length).toBe(requiredRemoteAssets(item).length);

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
    vi.unstubAllGlobals();
  });

  it("dedupes concurrent download jobs for the same item", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => publicFile(String(input))));
    const item = getMediaItemById("game-count-bananas-kg2")!;
    const [a, b] = await Promise.all([downloadMediaPack(item), downloadMediaPack(item)]);
    expect(a.id).toBe(b.id);
    const packs = await listOfflineMediaPacks();
    expect(packs.filter((row) => row.itemId === item.id)).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("keeps game playable from the offline snapshot without catalog lookup", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => publicFile(String(input))));
    const item = getMediaItemById("pic-mango-kg2")!;
    await downloadMediaPack(item);
    const pack = await getOfflineMediaPack(item.id);
    expect(pack?.item.game?.prompt).toContain("mango");
    expect(pack?.item.narrations[0]?.text).toBe("Mango");
    expect(MEDIA_LIBRARY_CATALOG.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });

  it("skips missing optional remote media without failing the pack", async () => {
    const item = {
      ...getMediaItemById("country-ghana-profile")!,
      offlineEligible: true,
      remoteMedia: [
        {
          kind: "remote" as const,
          url: "https://example.invalid/missing-audio.mp3",
          mimeType: "audio/mpeg",
          estimatedBytes: 12_000,
          required: false,
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
    expect(isOfflinePackComplete(pack)).toBe(true);
    expect(pack.errorMessage).toMatch(/Optional media skipped/i);
    vi.unstubAllGlobals();
  });

  it("does not mark packs ready when required remotes fail", async () => {
    const item = {
      ...getMediaItemById("pic-mango-kg2")!,
      remoteMedia: [
        {
          kind: "remote" as const,
          url: "https://example.invalid/required-picture.svg",
          mimeType: "image/svg+xml",
          estimatedBytes: 800,
          required: true,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Network down");
      })
    );
    await expect(downloadMediaPack(item)).rejects.toThrow(/Required media missing/i);
    const pack = await getOfflineMediaPack(item.id);
    expect(pack?.status).toBe("error");
    expect(isOfflinePackComplete(pack!)).toBe(false);
    expect(await listCompleteOfflineMediaPacks()).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("marks interrupted downloads as error, not ready", async () => {
    const item = getMediaItemById("story-ananse-listen")!;
    const controller = new AbortController();
    let fetches = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        fetches += 1;
        if (fetches === 2) {
          controller.abort();
          const err = new Error("Aborted");
          err.name = "AbortError";
          throw err;
        }
        if (init?.signal?.aborted) {
          const err = new Error("Aborted");
          err.name = "AbortError";
          throw err;
        }
        return publicFile(String(input));
      })
    );
    await expect(
      downloadMediaPack(item, { signal: controller.signal })
    ).rejects.toThrow(/interrupted/i);
    const pack = await getOfflineMediaPack(item.id);
    expect(pack?.status).toBe("error");
    expect(pack?.errorMessage).toMatch(/interrupted/i);
    expect(isOfflinePackComplete(pack!)).toBe(false);
    vi.unstubAllGlobals();
  });

  it("requires every advertised KG2 media asset file to exist on disk", () => {
    for (const id of GHANA_KG2_MEDIA_SLICE_IDS) {
      const item = getMediaItemById(id)!;
      expect(item).toBeTruthy();
      const required = requiredRemoteAssets(item);
      expect(required.length).toBeGreaterThan(0);
      for (const asset of required) {
        const file = resolve(
          __dirname,
          "../../web/public",
          asset.url.replace(/^\//, "")
        );
        expect(existsSync(file), `missing ${asset.url}`).toBe(true);
        expect(readFileSync(file).byteLength).toBeGreaterThan(0);
      }
    }
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
      countryId: "ghana",
    });
    expect(hasCompletedGame("pic-mango-kg2")).toBe(true);
    expect(listLocalMediaProgress("pic-mango-kg2").map((row) => row.kind)).toEqual(
      expect.arrayContaining(["viewed", "heard", "game_completed"])
    );
    const queued = await listOfflineProgressEvents();
    expect(
      queued.some((row) => row.topicKey === "media:ghana:pic-mango-kg2" && row.score === 100)
    ).toBe(true);
  });

  it("flushes queued media progress on reconnect", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    await recordMediaProgress({
      itemId: "pic-mango-kg2",
      kind: "game_completed",
      score: 100,
      subject: "Our World",
      curriculum: "kg-2",
      countryId: "ghana",
    });
    const mutate = vi.fn(async () => undefined);
    const result = await flushOfflineProgressQueue(mutate);
    expect(result.synced).toBeGreaterThanOrEqual(1);
    expect(mutate).toHaveBeenCalled();
    const remaining = await listOfflineProgressEvents();
    expect(remaining.some((row) => row.topicKey === "media:ghana:pic-mango-kg2")).toBe(
      false
    );
  });
});
