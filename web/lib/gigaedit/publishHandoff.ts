/**
 * GigaEdit → GigaSocial publish handoff.
 * Metadata in sessionStorage; media blobs in IndexedDB (never overwrite originals).
 */

import type {
  GigaEditPublishDestination,
  GigaEditPublishHandoff,
  GigaEditPublishPackageMeta,
} from "@/lib/gigaedit/publishTypes";
import { isGigaEditOnline } from "@/lib/gigaedit/offline";
import { enqueuePublishQueue } from "@/lib/gigaedit/publishQueue";

const META_KEY = "giga3_gigaedit_publish_handoff_v1";
const META_BACKUP_KEY = "giga3_gigaedit_publish_handoff_backup_v1";
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

/** Wait until the readwrite transaction fully commits (critical before navigation). */
function awaitTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction error"));
  });
}

export async function putPublishBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  if (!db) throw new Error("IndexedDB unavailable — cannot stage publish media.");
  const tx = db.transaction(BLOB_STORE, "readwrite");
  tx.objectStore(BLOB_STORE).put({ key, blob, savedAt: Date.now() });
  await awaitTransaction(tx);
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
  tx.objectStore(BLOB_STORE).delete(key);
  await awaitTransaction(tx);
}

function writeHandoffMeta(handoff: GigaEditPublishHandoff): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(handoff);
  try {
    sessionStorage.setItem(META_KEY, raw);
  } catch {
    /* quota */
  }
  try {
    // Survive rare sessionStorage clears across same-origin navigations in some PWAs.
    localStorage.setItem(META_BACKUP_KEY, raw);
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent("giga3:gigaedit-publish-ready", { detail: handoff }));
}

function clearHandoffMeta(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(META_BACKUP_KEY);
  } catch {
    /* ignore */
  }
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

  // Commit each blob transaction before writing meta / navigating.
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

  writeHandoffMeta(handoff);
  return handoff;
}

export function peekPublishHandoff(): GigaEditPublishHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(META_KEY) ?? localStorage.getItem(META_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GigaEditPublishHandoff;
  } catch {
    return null;
  }
}

export function consumePublishHandoffMeta(): GigaEditPublishHandoff | null {
  const handoff = peekPublishHandoff();
  clearHandoffMeta();
  return handoff;
}

export async function loadPublishHandoffFiles(handoff: GigaEditPublishHandoff): Promise<{
  edited: File | null;
  original: File | null;
  audio: File | null;
}> {
  const loadOnce = async () => {
    const [editedBlob, originalBlob, audioBlob] = await Promise.all([
      getPublishBlob(handoff.editedBlobKey),
      getPublishBlob(handoff.originalBlobKey),
      handoff.audioBlobKey ? getPublishBlob(handoff.audioBlobKey) : Promise.resolve(null),
    ]);

    const toFile = (blob: Blob | null, name: string, mime: string) =>
      blob ? new File([blob], name, { type: mime || blob.type || "application/octet-stream" }) : null;

    return {
      edited: toFile(editedBlob, handoff.fileName, handoff.mimeType),
      original: toFile(originalBlob, `original-${handoff.fileName}`, handoff.mimeType),
      audio: toFile(
        audioBlob,
        handoff.soundTitle ? `${handoff.soundTitle}.webm` : `sound-${handoff.id}.webm`,
        audioBlob?.type || "audio/webm"
      ),
    };
  };

  let files = await loadOnce();
  if (!files.edited) {
    // Brief retry — covers slow IDB visibility right after a cross-page navigation.
    await new Promise((r) => setTimeout(r, 120));
    files = await loadOnce();
  }
  return files;
}

export function gigasocialPublishUrl(destination: GigaEditPublishDestination = "feed"): string {
  const tab = destination === "story" ? "feed" : "feed";
  return `/gigasocial/?tab=${tab}&gigaeditPublish=1`;
}

export function launchGigaSocialWithHandoff(
  destination: GigaEditPublishDestination = "feed"
): void {
  if (typeof window === "undefined") return;
  const url = gigasocialPublishUrl(destination);
  // Full navigation so FeedPanel mounts fresh and picks up sessionStorage/IDB handoff.
  window.location.assign(url);
}

/**
 * Stage media + open GigaSocial feed composer. Queues when offline.
 * Skips heavy audio work so navigation is never blocked.
 */
export async function handoffAndOpenGigaSocial(input: {
  kind: GigaEditPublishPackageMeta["kind"];
  edited: File;
  original: File;
  aspectRatio: GigaEditPublishPackageMeta["aspectRatio"];
  destination?: GigaEditPublishDestination;
  caption?: string;
  privacy?: GigaEditPublishPackageMeta["privacy"];
  projectId?: string;
  durationSec?: number;
  aiAssisted?: boolean;
  soundId?: string;
  soundTitle?: string;
  audio?: Blob | null;
  audioMixMode?: GigaEditPublishPackageMeta["audioMixMode"];
  allowSoundReuse?: boolean;
}): Promise<{ opened: boolean; queued: boolean; error?: string }> {
  const destination = input.destination ?? "feed";
  try {
    const handoff = await storePublishHandoff({
      meta: {
        kind: input.kind,
        projectId: input.projectId,
        fileName: input.edited.name,
        mimeType:
          input.edited.type || (input.kind === "video" ? "video/mp4" : "image/png"),
        aspectRatio: input.aspectRatio,
        durationSec: input.durationSec,
        caption: input.caption ?? "",
        privacy: input.privacy ?? "public_reusable",
        allowSoundReuse: input.allowSoundReuse ?? false,
        soundId: input.soundId,
        soundTitle: input.soundTitle,
        audioMixMode: input.audioMixMode ?? "original",
        aiAssisted: Boolean(input.aiAssisted),
        destination,
      },
      edited: input.edited,
      original: input.original,
      audio: input.audio ?? null,
    });

    if (!isGigaEditOnline()) {
      await enqueuePublishQueue({ handoff, destination });
      return { opened: false, queued: true };
    }

    launchGigaSocialWithHandoff(destination);
    return { opened: true, queued: false };
  } catch (err) {
    return {
      opened: false,
      queued: false,
      error: err instanceof Error ? err.message : "Could not open GigaSocial publish.",
    };
  }
}
