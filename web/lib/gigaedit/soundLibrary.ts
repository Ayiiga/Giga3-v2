/**
 * Local reusable sound library for GigaEdit ↔ GigaSocial.
 * Frontend-only IndexedDB catalog — no schema/API changes.
 */

export type SoundPermission = "public_reusable" | "public_no_reuse" | "followers" | "private";

export type SoundCategory =
  | "trending"
  | "original"
  | "own"
  | "saved"
  | "ai"
  | "device"
  | "public_post";

export type GigaEditSoundAsset = {
  soundId: string;
  title: string;
  creatorHandle: string;
  creatorDisplayName: string;
  sourcePostId?: string;
  durationSec: number;
  usageCount: number;
  createdAt: number;
  permission: SoundPermission;
  category: SoundCategory;
  favorite: boolean;
  lastUsedAt?: number;
  aiGenerated: boolean;
  /** Blob key in sound DB */
  blobKey: string;
};

const DB_NAME = "giga3-gigaedit-sounds-v1";
const DB_VERSION = 1;
const META_STORE = "sounds";
const BLOB_STORE = "blobs";
const CACHE_MAX = 80;

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
        db.createObjectStore(META_STORE, { keyPath: "soundId" });
      }
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

export function newSoundId(): string {
  return `snd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listSounds(): Promise<GigaEditSoundAsset[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(META_STORE, "readonly");
    const rows = (await idbReq(tx.objectStore(META_STORE).getAll())) as GigaEditSoundAsset[];
    return rows.sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt));
  } catch {
    return [];
  }
}

export async function getSound(soundId: string): Promise<GigaEditSoundAsset | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(META_STORE, "readonly");
    return ((await idbReq(tx.objectStore(META_STORE).get(soundId))) as GigaEditSoundAsset) ?? null;
  } catch {
    return null;
  }
}

export async function getSoundBlob(soundId: string): Promise<Blob | null> {
  const sound = await getSound(soundId);
  if (!sound) return null;
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const row = (await idbReq(tx.objectStore(BLOB_STORE).get(sound.blobKey))) as
      | { blob?: Blob }
      | undefined;
    return row?.blob ?? null;
  } catch {
    return null;
  }
}

export async function saveSound(input: {
  title: string;
  blob: Blob;
  durationSec: number;
  creatorHandle: string;
  creatorDisplayName?: string;
  sourcePostId?: string;
  permission: SoundPermission;
  category?: SoundCategory;
  aiGenerated?: boolean;
  soundId?: string;
}): Promise<GigaEditSoundAsset | null> {
  if (input.permission === "public_no_reuse" || input.permission === "private") {
    // Still store for the creator's "own" library, but mark non-reusable for others.
  }
  const db = await openDb();
  if (!db) return null;

  const soundId = input.soundId ?? newSoundId();
  const blobKey = `blob:${soundId}`;
  const asset: GigaEditSoundAsset = {
    soundId,
    title: input.title.trim() || "Original Sound",
    creatorHandle: input.creatorHandle.replace(/^@/, "") || "creator",
    creatorDisplayName: input.creatorDisplayName || input.creatorHandle || "Creator",
    sourcePostId: input.sourcePostId,
    durationSec: Math.max(0, input.durationSec),
    usageCount: 0,
    createdAt: Date.now(),
    permission: input.permission,
    category: input.category ?? "original",
    favorite: false,
    aiGenerated: Boolean(input.aiGenerated),
    blobKey,
  };

  const tx = db.transaction([META_STORE, BLOB_STORE], "readwrite");
  await idbReq(tx.objectStore(BLOB_STORE).put({ key: blobKey, blob: input.blob, savedAt: Date.now() }));
  await idbReq(tx.objectStore(META_STORE).put(asset));

  // Cap library size
  const all = await listSounds();
  if (all.length > CACHE_MAX) {
    const drop = all.slice(CACHE_MAX);
    for (const s of drop) {
      await deleteSound(s.soundId);
    }
  }

  return asset;
}

export async function deleteSound(soundId: string): Promise<void> {
  const sound = await getSound(soundId);
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction([META_STORE, BLOB_STORE], "readwrite");
  await idbReq(tx.objectStore(META_STORE).delete(soundId));
  if (sound) await idbReq(tx.objectStore(BLOB_STORE).delete(sound.blobKey));
}

export async function incrementSoundUsage(soundId: string): Promise<void> {
  const sound = await getSound(soundId);
  if (!sound) return;
  const db = await openDb();
  if (!db) return;
  const next = {
    ...sound,
    usageCount: sound.usageCount + 1,
    lastUsedAt: Date.now(),
  };
  const tx = db.transaction(META_STORE, "readwrite");
  await idbReq(tx.objectStore(META_STORE).put(next));
}

export async function toggleSoundFavorite(soundId: string): Promise<void> {
  const sound = await getSound(soundId);
  if (!sound) return;
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(META_STORE, "readwrite");
  await idbReq(tx.objectStore(META_STORE).put({ ...sound, favorite: !sound.favorite }));
}

export function canReuseSound(sound: GigaEditSoundAsset, viewerHandle?: string): boolean {
  if (sound.permission === "private") {
    return Boolean(viewerHandle && viewerHandle === sound.creatorHandle);
  }
  if (sound.permission === "public_no_reuse") {
    return Boolean(viewerHandle && viewerHandle === sound.creatorHandle);
  }
  if (sound.permission === "followers") {
    // Local library cannot verify follows — allow preview; publish still respects creator flag.
    return true;
  }
  return sound.permission === "public_reusable";
}

export function soundAttributionLine(sound: GigaEditSoundAsset): string {
  return `Original Sound by @${sound.creatorHandle}`;
}

export function filterSounds(
  sounds: GigaEditSoundAsset[],
  options: {
    query?: string;
    category?: SoundCategory | "all" | "favorites" | "recent";
  }
): GigaEditSoundAsset[] {
  let rows = [...sounds];
  const q = options.query?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.creatorHandle.toLowerCase().includes(q) ||
        s.soundId.toLowerCase().includes(q)
    );
  }
  if (options.category === "favorites") {
    rows = rows.filter((s) => s.favorite);
  } else if (options.category === "recent") {
    rows = rows.filter((s) => s.lastUsedAt).sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
  } else if (options.category && options.category !== "all") {
    rows = rows.filter((s) => s.category === options.category);
  }
  return rows;
}
