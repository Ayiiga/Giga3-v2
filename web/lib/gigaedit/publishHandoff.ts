/**
 * GigaEdit → GigaSocial publish handoff.
 * Metadata in sessionStorage; media blobs in IndexedDB (never overwrite originals).
 */

import type { GigaEditPublishHandoff, GigaEditPublishPackageMeta } from "@/lib/gigaedit/publishTypes";

const META_KEY = "giga3_gigaedit_publish_handoff_v1";
const DB_NAME = "giga3-gigaedit-publish-v1";
const DB_VERSION = 1;
const BLOB_STORE = "blobs";

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: "key" });
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

export async function putPublishBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(BLOB_STORE, "readwrite");
  await idbReq(tx.objectStore(BLOB_STORE).put({ key, blob, savedAt: Date.now() }));
}

export async function getPublishBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const row = (await idbReq(tx.objectStore(BLOB_STORE).get(key))) as
      | { blob?: Blob }
      | undefined;
    return row?.blob ?? null;
  } catch {
    return null;
  }
}

export async function deletePublishBlob(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(BLOB_STORE, "readwrite");
  await idbReq(tx.objectStore(BLOB_STORE).delete(key));
}

export async function storePublishHandoff(input: {
  meta: Omit<GigaEditPublishPackageMeta, "id" | "createdAt" | "editedBlobKey" | "originalBlobKey"> & {
    id?: string;
  };
  edited: Blob;
  original: Blob;
  audio?: Blob | null;
}): Promise<GigaEditPublishHandoff> {
  const id = input.meta.id ?? `pub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const editedBlobKey = `${id}:edited`;
  const originalBlobKey = `${id}:original`;
  const audioBlobKey = input.audio ? `${id}:audio` : undefined;

  await putPublishBlob(editedBlobKey, input.edited);
  await putPublishBlob(originalBlobKey, input.original);
  if (input.audio && audioBlobKey) await putPublishBlob(audioBlobKey, input.audio);

  const handoff: GigaEditPublishHandoff = {
    id,
    kind: input.meta.kind,
    projectId: input.meta.projectId,
    fileName: input.meta.fileName,
    mimeType: input.meta.mimeType,
    aspectRatio: input.meta.aspectRatio,
    durationSec: input.meta.durationSec,
    caption: input.meta.caption,
    privacy: input.meta.privacy,
    allowSoundReuse: input.meta.allowSoundReuse,
    soundId: input.meta.soundId,
    soundTitle: input.meta.soundTitle,
    audioMixMode: input.meta.audioMixMode,
    aiAssisted: input.meta.aiAssisted,
    destination: input.meta.destination,
    createdAt: Date.now(),
    editedBlobKey,
    originalBlobKey,
    audioBlobKey,
  };

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(META_KEY, JSON.stringify(handoff));
      window.dispatchEvent(new CustomEvent("giga3:gigaedit-publish-ready", { detail: handoff }));
    } catch {
      /* quota */
    }
  }
  return handoff;
}

export function peekPublishHandoff(): GigaEditPublishHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GigaEditPublishHandoff;
  } catch {
    return null;
  }
}

export function consumePublishHandoffMeta(): GigaEditPublishHandoff | null {
  const handoff = peekPublishHandoff();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(META_KEY);
    } catch {
      /* ignore */
    }
  }
  return handoff;
}

export async function loadPublishHandoffFiles(handoff: GigaEditPublishHandoff): Promise<{
  edited: File | null;
  original: File | null;
  audio: File | null;
}> {
  const [editedBlob, originalBlob, audioBlob] = await Promise.all([
    getPublishBlob(handoff.editedBlobKey),
    getPublishBlob(handoff.originalBlobKey),
    handoff.audioBlobKey ? getPublishBlob(handoff.audioBlobKey) : Promise.resolve(null),
  ]);

  const toFile = (blob: Blob | null, name: string, mime: string) =>
    blob ? new File([blob], name, { type: mime || blob.type || "application/octet-stream" }) : null;

  return {
    edited: toFile(editedBlob, handoff.fileName, handoff.mimeType),
    original: toFile(
      originalBlob,
      `original-${handoff.fileName}`,
      handoff.mimeType
    ),
    audio: toFile(
      audioBlob,
      handoff.soundTitle ? `${handoff.soundTitle}.webm` : `sound-${handoff.id}.webm`,
      audioBlob?.type || "audio/webm"
    ),
  };
}

export function launchGigaSocialWithHandoff(): void {
  if (typeof window === "undefined") return;
  const url = "/gigasocial/?tab=feed&gigaeditPublish=1";
  window.location.assign(url);
}
