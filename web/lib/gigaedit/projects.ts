/**
 * Offline-first GigaEdit project store (IndexedDB).
 * Original media blobs are stored separately and never overwritten on export.
 */

import type {
  ExportAspectRatio,
  GigaEditProjectKind,
  GigaEditProjectMeta,
  GigaEditProjectStatus,
  GigaEditTimelineClip,
} from "@/lib/gigaedit/types";

const DB_NAME = "giga3-gigaedit-v1";
const DB_VERSION = 1;
const META_STORE = "projects";
const BLOB_STORE = "media";

export type GigaEditProjectRecord = GigaEditProjectMeta & {
  clips: GigaEditTimelineClip[];
  scriptText?: string;
  overlayText?: string;
  filterId?: string;
  brightness?: number;
  contrast?: number;
  saturate?: number;
};

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB error"));
  });
}

export async function listGigaEditProjects(): Promise<GigaEditProjectRecord[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(META_STORE, "readonly");
    const rows = await idbReq(tx.objectStore(META_STORE).getAll());
    return (rows as GigaEditProjectRecord[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getGigaEditProject(id: string): Promise<GigaEditProjectRecord | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(META_STORE, "readonly");
    const row = await idbReq(tx.objectStore(META_STORE).get(id));
    return (row as GigaEditProjectRecord) ?? null;
  } catch {
    return null;
  }
}

export async function saveGigaEditProject(
  project: GigaEditProjectRecord
): Promise<GigaEditProjectRecord> {
  const db = await openDb();
  if (!db) return project;
  const next = { ...project, updatedAt: Date.now() };
  const tx = db.transaction(META_STORE, "readwrite");
  await idbReq(tx.objectStore(META_STORE).put(next));
  return next;
}

export async function duplicateGigaEditProject(id: string): Promise<GigaEditProjectRecord | null> {
  const existing = await getGigaEditProject(id);
  if (!existing) return null;
  const copy: GigaEditProjectRecord = {
    ...existing,
    id: `ge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: `${existing.title} (copy)`,
    status: "draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveGigaEditProject(copy);
  const originalBlob = await getProjectOriginalBlob(id);
  if (originalBlob) await putProjectOriginalBlob(copy.id, originalBlob);
  return copy;
}

export async function deleteGigaEditProject(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction([META_STORE, BLOB_STORE], "readwrite");
  await idbReq(tx.objectStore(META_STORE).delete(id));
  await idbReq(tx.objectStore(BLOB_STORE).delete(id));
}

export async function putProjectOriginalBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(BLOB_STORE, "readwrite");
  await idbReq(
    tx.objectStore(BLOB_STORE).put({
      id,
      blob,
      role: "original",
      savedAt: Date.now(),
    })
  );
}

export async function getProjectOriginalBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const row = (await idbReq(tx.objectStore(BLOB_STORE).get(id))) as
      | { blob?: Blob }
      | undefined;
    return row?.blob ?? null;
  } catch {
    return null;
  }
}

/** Side media (e.g. voiceover) keyed as `${projectId}::audio` — never overwrites the original. */
export async function putProjectAudioBlob(projectId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(BLOB_STORE, "readwrite");
  await idbReq(
    tx.objectStore(BLOB_STORE).put({
      id: `${projectId}::audio`,
      blob,
      role: "audio",
      savedAt: Date.now(),
    })
  );
}

export async function getProjectAudioBlob(projectId: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const row = (await idbReq(tx.objectStore(BLOB_STORE).get(`${projectId}::audio`))) as
      | { blob?: Blob }
      | undefined;
    return row?.blob ?? null;
  } catch {
    return null;
  }
}

export function sectionForProjectKind(
  kind: GigaEditProjectKind
): "video" | "photo" | "teleprompter" | "audio" | "social" | "templates" {
  if (kind === "photo") return "photo";
  if (kind === "teleprompter") return "teleprompter";
  if (kind === "audio") return "audio";
  if (kind === "social") return "social";
  if (kind === "template") return "templates";
  return "video";
}

export function createEmptyProject(input: {
  kind: GigaEditProjectKind;
  title?: string;
  aspectRatio?: ExportAspectRatio;
}): GigaEditProjectRecord {
  const now = Date.now();
  return {
    id: `ge_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: input.title ?? `Untitled ${input.kind}`,
    kind: input.kind,
    status: "draft" satisfies GigaEditProjectStatus,
    createdAt: now,
    updatedAt: now,
    aspectRatio: input.aspectRatio ?? "9:16",
    aiAssisted: false,
    hasOriginal: false,
    offlineReady: true,
    clips: [],
  };
}

export function exportProjectJson(project: GigaEditProjectRecord): string {
  return JSON.stringify(
    {
      ...project,
      exportedAt: Date.now(),
      note: "GigaEdit local project export — media blobs are not embedded.",
    },
    null,
    2
  );
}
