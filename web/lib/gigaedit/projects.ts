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
import { GIGAEDIT_BRAND_KIT_STORE_ID } from "@/lib/gigaedit/creatorStudio/brandKit";

const DB_NAME = "giga3-gigaedit-v1";
const DB_VERSION = 2;
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

function isProjectMetaRow(row: unknown): row is GigaEditProjectRecord {
  if (!row || typeof row !== "object") return false;
  const record = row as Partial<GigaEditProjectRecord>;
  if (record.id === GIGAEDIT_BRAND_KIT_STORE_ID) return false;
  return typeof record.kind === "string" && typeof record.title === "string";
}

/** Deduplicate by project id — keep the row with the latest updatedAt. */
export function deduplicateGigaEditProjects(
  rows: GigaEditProjectRecord[]
): GigaEditProjectRecord[] {
  const byId = new Map<string, GigaEditProjectRecord>();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing || row.updatedAt >= existing.updatedAt) {
      byId.set(row.id, row);
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listGigaEditProjects(): Promise<GigaEditProjectRecord[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(META_STORE, "readonly");
    const rows = await idbReq(tx.objectStore(META_STORE).getAll());
    return deduplicateGigaEditProjects(
      (rows as unknown[]).filter(isProjectMetaRow) as GigaEditProjectRecord[]
    );
  } catch {
    return [];
  }
}

export async function getGigaEditProject(id: string): Promise<GigaEditProjectRecord | null> {
  if (id === GIGAEDIT_BRAND_KIT_STORE_ID) return null;
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
  if (project.id === GIGAEDIT_BRAND_KIT_STORE_ID || !isProjectMetaRow(project)) {
    return project;
  }
  const db = await openDb();
  if (!db) return project;
  const next = { ...project, updatedAt: Date.now() };
  const tx = db.transaction(META_STORE, "readwrite");
  await idbReq(tx.objectStore(META_STORE).put(next));
  return next;
}

export async function duplicateGigaEditProject(id: string): Promise<GigaEditProjectRecord | null> {
  if (id === GIGAEDIT_BRAND_KIT_STORE_ID) return null;
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
  for (const clip of existing.clips) {
    if (clip.sourceKey) {
      const blob = await getProjectClipBlob(id, clip.sourceKey);
      if (blob) await putProjectClipBlob(copy.id, clip.sourceKey, blob);
    }
  }
  return copy;
}

async function purgeProjectOpfsArtifacts(projectId: string): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) return;
  try {
    const root = await navigator.storage.getDirectory();
    const voiceDir = await root.getDirectoryHandle("gigaedit-voiceover", { create: false }).catch(() => null);
    if (!voiceDir) return;
    const prefix = projectId.slice(0, 12);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [name] of (voiceDir as any).entries()) {
      if (typeof name === "string" && name.includes(prefix)) {
        await voiceDir.removeEntry(name, { recursive: true }).catch(() => undefined);
      }
    }
  } catch {
    /* OPFS optional */
  }
}

export async function estimateProjectBlobBytes(id: string): Promise<number> {
  const db = await openDb();
  if (!db) return 0;
  let total = 0;
  try {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const store = tx.objectStore(BLOB_STORE);
    const keys = [id, `${id}::audio`];
    for (const key of keys) {
      const row = (await idbReq(store.get(key))) as { blob?: Blob } | undefined;
      if (row?.blob) total += row.blob.size;
    }
  } catch {
    return 0;
  }
  return total;
}

export async function estimateGigaEditStorageBytes(): Promise<number> {
  const db = await openDb();
  if (!db) return 0;
  let total = 0;
  try {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const rows = await idbReq(tx.objectStore(BLOB_STORE).getAll());
    for (const row of rows as { blob?: Blob }[]) {
      if (row?.blob) total += row.blob.size;
    }
  } catch {
    return 0;
  }
  return total;
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function deleteGigaEditProject(id: string): Promise<void> {
  if (id === GIGAEDIT_BRAND_KIT_STORE_ID) return;
  const db = await openDb();
  if (!db) return;
  const project = await getGigaEditProject(id);
  const tx = db.transaction([META_STORE, BLOB_STORE], "readwrite");
  await idbReq(tx.objectStore(META_STORE).delete(id));
  await idbReq(tx.objectStore(BLOB_STORE).delete(id));
  if (project) {
    for (const clip of project.clips) {
      if (clip.sourceKey) {
        await idbReq(tx.objectStore(BLOB_STORE).delete(clipBlobId(id, clip.sourceKey)));
      }
    }
    await idbReq(tx.objectStore(BLOB_STORE).delete(`${id}::audio`));
  }
  await purgeProjectOpfsArtifacts(id);
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

function clipBlobId(projectId: string, sourceKey: string): string {
  return `${projectId}::clip::${sourceKey}`;
}

/** Persist a joined clip source blob without overwriting the legacy original slot. */
export async function putProjectClipBlob(
  projectId: string,
  sourceKey: string,
  blob: Blob
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(BLOB_STORE, "readwrite");
  await idbReq(
    tx.objectStore(BLOB_STORE).put({
      id: clipBlobId(projectId, sourceKey),
      blob,
      role: "clip",
      sourceKey,
      savedAt: Date.now(),
    })
  );
}

export async function getProjectClipBlob(
  projectId: string,
  sourceKey: string
): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const row = (await idbReq(tx.objectStore(BLOB_STORE).get(clipBlobId(projectId, sourceKey)))) as
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
