/**
 * @vitest-environment happy-dom
 */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BRAND_KIT,
  GIGAEDIT_BRAND_KIT_STORE_ID,
} from "../../web/lib/gigaedit/creatorStudio/brandKit";
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
const META_STORE = "projects";
const BLOB_STORE = "media";

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
    await expect(deleteGigaEditProject("")).resolves.toBeUndefined();

    expect(await getGigaEditProject(project.id)).toBeNull();
    expect(await getProjectClipBlob(project.id, "only-clip")).toBeNull();
  });

  it("leaves brand-kit metadata intact when deleting a project", async () => {
    const project = createEmptyProject({ kind: "video", title: "Has brand kit neighbor" });
    await saveGigaEditProject(project);
    await putProjectOriginalBlob(project.id, new Blob(["orig"]));

    // Seed brand kit directly into the shared projects store.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error ?? new Error("open failed"));
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(META_STORE, "readwrite");
        tx.objectStore(META_STORE).put({
          ...DEFAULT_BRAND_KIT,
          id: GIGAEDIT_BRAND_KIT_STORE_ID,
          updatedAt: Date.now(),
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("put brand kit failed"));
        };
      };
    });

    await deleteGigaEditProject(project.id);
    await expect(deleteGigaEditProject(GIGAEDIT_BRAND_KIT_STORE_ID)).resolves.toBeUndefined();

    const brandKit = await new Promise<unknown>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error ?? new Error("open failed"));
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(META_STORE, "readonly");
        const getReq = tx.objectStore(META_STORE).get(GIGAEDIT_BRAND_KIT_STORE_ID);
        getReq.onsuccess = () => {
          const value = getReq.result;
          db.close();
          resolve(value ?? null);
        };
        getReq.onerror = () => {
          db.close();
          reject(getReq.error ?? new Error("get brand kit failed"));
        };
      };
    });

    expect(brandKit).not.toBeNull();
    expect((brandKit as { id: string }).id).toBe(GIGAEDIT_BRAND_KIT_STORE_ID);
    expect(await getGigaEditProject(project.id)).toBeNull();
  });

  it("rolls back all deletes when the transaction aborts after requests are queued", async () => {
    const project = createEmptyProject({ kind: "video", title: "Abort me" });
    const other = createEmptyProject({ kind: "video", title: "Keep me" });
    await saveGigaEditProject(project);
    await saveGigaEditProject(other);
    await putProjectOriginalBlob(project.id, new Blob(["orig"]));
    await putProjectClipBlob(project.id, "c1", new Blob(["c1"]));
    await putProjectClipBlob(project.id, "c2", new Blob(["c2"]));
    await putProjectAudioBlob(project.id, new Blob(["aud"]));
    await putProjectOriginalBlob(other.id, new Blob(["other-orig"]));
    await putProjectClipBlob(other.id, "ox", new Blob(["other-clip"]));
    await putProjectAudioBlob(other.id, new Blob(["other-aud"]));

    const keysBefore = (await listMediaKeys()).slice().sort();
    const metaBefore = await getGigaEditProject(project.id);
    const otherBefore = await getGigaEditProject(other.id);
    expect(metaBefore).not.toBeNull();
    expect(otherBefore).not.toBeNull();

    const expectedChildKeys = new Set([
      `${project.id}::clip::c1`,
      `${project.id}::clip::c2`,
      `${project.id}::audio`,
    ]);

    const observed = {
      metaDeleteQueued: false,
      primaryMediaDeleteQueued: false,
      ownedCursorOpened: false,
      childDeletesQueued: new Set<string>(),
      abortedAfterFullQueue: false,
    };

    let deleteTx: IDBTransaction | null = null;

    const originalTransaction = IDBDatabase.prototype.transaction;
    const originalStoreDelete = IDBObjectStore.prototype.delete;
    const originalOpenCursor = IDBObjectStore.prototype.openCursor;
    const originalCursorDelete = IDBCursor.prototype.delete;

    const restore = () => {
      IDBDatabase.prototype.transaction = originalTransaction;
      IDBObjectStore.prototype.delete = originalStoreDelete;
      IDBObjectStore.prototype.openCursor = originalOpenCursor;
      IDBCursor.prototype.delete = originalCursorDelete;
    };

    const tryAbortAfterFullQueue = () => {
      if (observed.abortedAfterFullQueue || !deleteTx) return;
      const childrenDone =
        observed.childDeletesQueued.size === expectedChildKeys.size &&
        [...expectedChildKeys].every((k) => observed.childDeletesQueued.has(k));
      if (
        !(
          observed.metaDeleteQueued &&
          observed.primaryMediaDeleteQueued &&
          observed.ownedCursorOpened &&
          childrenDone
        )
      ) {
        return;
      }
      // Abort synchronously after the final required delete was queued, before commit.
      observed.abortedAfterFullQueue = true;
      deleteTx.abort();
    };

    IDBDatabase.prototype.transaction = function patchedTransaction(
      this: IDBDatabase,
      storeNames: string | string[],
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions
    ) {
      const tx = originalTransaction.call(this, storeNames, mode, options);
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      if (
        names.includes(META_STORE) &&
        names.includes(BLOB_STORE) &&
        mode === "readwrite"
      ) {
        deleteTx = tx;
      }
      return tx;
    };

    IDBObjectStore.prototype.delete = function patchedStoreDelete(
      this: IDBObjectStore,
      key: IDBValidKey | IDBKeyRange
    ) {
      const keyStr = String(key);
      if (this.name === META_STORE && keyStr === project.id) {
        observed.metaDeleteQueued = true;
      }
      if (this.name === BLOB_STORE && keyStr === project.id) {
        observed.primaryMediaDeleteQueued = true;
      }
      const req = originalStoreDelete.call(this, key);
      tryAbortAfterFullQueue();
      return req;
    };

    IDBObjectStore.prototype.openCursor = function patchedOpenCursor(
      this: IDBObjectStore,
      query?: IDBValidKey | IDBKeyRange | null,
      direction?: IDBCursorDirection
    ) {
      const req = originalOpenCursor.call(this, query, direction);
      if (
        this.name === BLOB_STORE &&
        query &&
        typeof query === "object" &&
        "lower" in query &&
        String((query as IDBKeyRange).lower) === `${project.id}::`
      ) {
        observed.ownedCursorOpened = true;
      }
      tryAbortAfterFullQueue();
      return req;
    };

    IDBCursor.prototype.delete = function patchedCursorDelete(this: IDBCursor) {
      const keyStr = String(this.primaryKey ?? this.key);
      if (expectedChildKeys.has(keyStr)) {
        observed.childDeletesQueued.add(keyStr);
      }
      const req = originalCursorDelete.call(this);
      // Abort from this hook only after every expected child delete is queued.
      tryAbortAfterFullQueue();
      return req;
    };

    try {
      await expect(deleteGigaEditProject(project.id)).rejects.toBeTruthy();
    } finally {
      restore();
    }

    // Fail if abort raced ahead of the destructive queue (microtask-too-early case).
    expect(observed.metaDeleteQueued).toBe(true);
    expect(observed.primaryMediaDeleteQueued).toBe(true);
    expect(observed.ownedCursorOpened).toBe(true);
    expect([...observed.childDeletesQueued].sort()).toEqual(
      [...expectedChildKeys].sort()
    );
    expect(observed.abortedAfterFullQueue).toBe(true);

    const metaAfter = await getGigaEditProject(project.id);
    expect(metaAfter).not.toBeNull();
    expect(metaAfter).toMatchObject({
      id: project.id,
      title: "Abort me",
    });
    expect(metaAfter?.updatedAt).toBe(metaBefore?.updatedAt);

    expect(await getProjectOriginalBlob(project.id)).not.toBeNull();
    expect(await getProjectClipBlob(project.id, "c1")).not.toBeNull();
    expect(await getProjectClipBlob(project.id, "c2")).not.toBeNull();
    expect(await getProjectAudioBlob(project.id)).not.toBeNull();
    expect((await listMediaKeys()).slice().sort()).toEqual(keysBefore);

    expect(await getGigaEditProject(other.id)).toMatchObject({
      id: other.id,
      title: "Keep me",
    });
    expect(await getProjectOriginalBlob(other.id)).not.toBeNull();
    expect(await getProjectClipBlob(other.id, "ox")).not.toBeNull();
    expect(await getProjectAudioBlob(other.id)).not.toBeNull();
  });

  it("queues meta, primary, and owned-child deletes in one transaction (source)", () => {
    const src = readFileSync(resolve(__dirname, "../../web/lib/gigaedit/projects.ts"), "utf8");
    const fnStart = src.indexOf("export async function deleteGigaEditProject");
    const fnEnd = src.indexOf("export async function putProjectOriginalBlob");
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
    const body = src.slice(fnStart, fnEnd);

    expect(body).toContain('db.transaction([META_STORE, BLOB_STORE], "readwrite")');
    expect(body).toContain("meta.delete(id)");
    expect(body).toContain("blobs.delete(id)");
    expect(body).toContain("IDBKeyRange.bound");
    expect(body).toContain("blobs.openCursor(ownedRange)");
    expect(body).toContain("tx.oncomplete");
    expect(body).toContain("db.close()");
    // No second transaction for cursor cleanup.
    expect(body.match(/\.transaction\(/g)?.length).toBe(1);
    // Early brand-kit id guard removed; protection is isProjectMetaRow in-tx.
    expect(body).not.toContain("GIGAEDIT_BRAND_KIT_STORE_ID");
    expect(body).toContain("isProjectMetaRow");
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
