/**
 * @vitest-environment happy-dom
 */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GIGAEDIT_BRAND_KIT_STORE_ID } from "../../web/lib/gigaedit/creatorStudio/brandKit";
import {
  createEmptyProject,
  deleteGigaEditProject,
  getGigaEditProject,
  getProjectAudioBlob,
  getProjectClipBlob,
  getProjectOriginalBlob,
  isOwnedGigaEditMediaKey,
  putProjectAudioBlob,
  putProjectClipBlob,
  putProjectOriginalBlob,
  saveGigaEditProject,
} from "../../web/lib/gigaedit/projects";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DB_NAME = "giga3-gigaedit-v1";
const DB_VERSION = 2;

/**
 * Clear stores instead of deleteDatabase — fake-indexeddb (and browsers) block
 * deleteDatabase while production helpers still hold open IDBDatabase handles.
 */
async function resetDb() {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("media")) {
        db.createObjectStore("media", { keyPath: "id" });
      }
    };
    req.onerror = () => reject(req.error ?? new Error("open for reset failed"));
    req.onsuccess = () => {
      const db = req.result;
      try {
        if (!db.objectStoreNames.contains("projects") || !db.objectStoreNames.contains("media")) {
          db.close();
          resolve();
          return;
        }
        const tx = db.transaction(["projects", "media"], "readwrite");
        tx.objectStore("projects").clear();
        tx.objectStore("media").clear();
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("clear stores failed"));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("clear stores aborted"));
        };
      } catch (err) {
        db.close();
        reject(err);
      }
    };
  });
}

async function listMediaKeys(): Promise<string[]> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("open failed"));
  });
  try {
    if (!db.objectStoreNames.contains("media")) return [];
    const tx = db.transaction("media", "readonly");
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const req = tx.objectStore("media").getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("getAllKeys failed"));
    });
    return keys.map(String);
  } finally {
    db.close();
  }
}

describe("isOwnedGigaEditMediaKey", () => {
  it("matches original and namespaced child keys only", () => {
    const id = "ge_111_abc";
    expect(isOwnedGigaEditMediaKey(id, id)).toBe(true);
    expect(isOwnedGigaEditMediaKey(id, `${id}::audio`)).toBe(true);
    expect(isOwnedGigaEditMediaKey(id, `${id}::clip::k1`)).toBe(true);
    expect(isOwnedGigaEditMediaKey(id, "ge_111_abcdef")).toBe(false);
    expect(isOwnedGigaEditMediaKey(id, "ge_222_xyz::audio")).toBe(false);
    expect(isOwnedGigaEditMediaKey("", `${id}::audio`)).toBe(false);
  });
});

describe("deleteGigaEditProject owned media cleanup (D3)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(async () => {
    await resetDb();
  });

  it("deletes project metadata and all owned media records", async () => {
    const project = createEmptyProject({ kind: "video", title: "Cleanup me" });
    await saveGigaEditProject(project);
    await putProjectOriginalBlob(project.id, new Blob(["orig"], { type: "video/mp4" }));
    await putProjectClipBlob(project.id, "clip-a", new Blob(["a"], { type: "video/mp4" }));
    await putProjectClipBlob(project.id, "clip-b", new Blob(["b"], { type: "video/mp4" }));
    await putProjectAudioBlob(project.id, new Blob(["vo"], { type: "audio/webm" }));

    await deleteGigaEditProject(project.id);

    expect(await getGigaEditProject(project.id)).toBeNull();
    expect(await getProjectOriginalBlob(project.id)).toBeNull();
    expect(await getProjectClipBlob(project.id, "clip-a")).toBeNull();
    expect(await getProjectClipBlob(project.id, "clip-b")).toBeNull();
    expect(await getProjectAudioBlob(project.id)).toBeNull();

    const remaining = await listMediaKeys();
    expect(remaining.every((k) => !isOwnedGigaEditMediaKey(project.id, k))).toBe(true);
  });

  it("leaves another project's metadata and media unchanged", async () => {
    const a = createEmptyProject({ kind: "video", title: "A" });
    const b = createEmptyProject({ kind: "video", title: "B" });
    await saveGigaEditProject(a);
    await saveGigaEditProject(b);
    await putProjectOriginalBlob(a.id, new Blob(["a-orig"]));
    await putProjectClipBlob(a.id, "c1", new Blob(["a-c1"]));
    await putProjectAudioBlob(a.id, new Blob(["a-aud"]));
    await putProjectOriginalBlob(b.id, new Blob(["b-orig"]));
    await putProjectClipBlob(b.id, "c1", new Blob(["b-c1"]));
    await putProjectAudioBlob(b.id, new Blob(["b-aud"]));

    await deleteGigaEditProject(a.id);

    expect(await getGigaEditProject(a.id)).toBeNull();
    expect(await getGigaEditProject(b.id)).not.toBeNull();
    expect(await getProjectOriginalBlob(b.id)).not.toBeNull();
    expect(await getProjectClipBlob(b.id, "c1")).not.toBeNull();
    expect(await getProjectAudioBlob(b.id)).not.toBeNull();

    const keys = await listMediaKeys();
    expect(keys).toEqual(
      expect.arrayContaining([b.id, `${b.id}::clip::c1`, `${b.id}::audio`])
    );
    expect(keys.some((k) => isOwnedGigaEditMediaKey(a.id, k))).toBe(false);
  });

  it("cleans multiple clip blobs and audio together", async () => {
    const project = createEmptyProject({ kind: "video", title: "Multi" });
    await saveGigaEditProject(project);
    await putProjectOriginalBlob(project.id, new Blob(["o"]));
    for (const key of ["s1", "s2", "s3"]) {
      await putProjectClipBlob(project.id, key, new Blob([key]));
    }
    await putProjectAudioBlob(project.id, new Blob(["audio"]));

    await deleteGigaEditProject(project.id);

    const keys = await listMediaKeys();
    expect(keys.filter((k) => k.startsWith(`${project.id}`))).toEqual([]);
  });

  it("handles repeated deletion and partially missing records safely", async () => {
    const project = createEmptyProject({ kind: "video", title: "Partial" });
    await saveGigaEditProject(project);
    await putProjectClipBlob(project.id, "only-clip", new Blob(["c"]));
    // No original / audio on purpose

    await expect(deleteGigaEditProject(project.id)).resolves.toBeUndefined();
    await expect(deleteGigaEditProject(project.id)).resolves.toBeUndefined();
    await expect(deleteGigaEditProject("ge_missing_zzzzzz")).resolves.toBeUndefined();
    await expect(deleteGigaEditProject(GIGAEDIT_BRAND_KIT_STORE_ID)).resolves.toBeUndefined();
    await expect(deleteGigaEditProject("")).resolves.toBeUndefined();

    expect(await getGigaEditProject(project.id)).toBeNull();
    expect(await getProjectClipBlob(project.id, "only-clip")).toBeNull();
  });

  it("does not bump IndexedDB version and keeps ownership separator", () => {
    const src = readFileSync(resolve(__dirname, "../../web/lib/gigaedit/projects.ts"), "utf8");
    expect(src).toContain('const DB_NAME = "giga3-gigaedit-v1"');
    expect(src).toContain("const DB_VERSION = 2");
    expect(src).toContain("IDBKeyRange.bound");
    expect(src).toContain("${id}::");
    expect(src).toContain("isOwnedGigaEditMediaKey");
  });
});
