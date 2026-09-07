import type { VideoProject } from "@/lib/media/videoProject/types";

const DB_NAME = "giga3-media-video-projects-v1";
const DB_VERSION = 1;
const STORE = "projects";

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
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

export async function listVideoProjects(): Promise<VideoProject[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE, "readonly");
    const rows = (await idbReq(tx.objectStore(STORE).getAll())) as VideoProject[];
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getVideoProject(id: string): Promise<VideoProject | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(STORE, "readonly");
    return (await idbReq(tx.objectStore(STORE).get(id))) as VideoProject | undefined ?? null;
  } catch {
    return null;
  }
}

export async function saveVideoProject(project: VideoProject): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).put({ ...project, updatedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteVideoProject(id: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).delete(id));
    return true;
  } catch {
    return false;
  }
}

/** Debounced autosave helper for React components. */
export function scheduleVideoProjectAutosave(
  project: VideoProject,
  delayMs = 2000
): { cancel: () => void; flush: () => Promise<boolean> } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = project;

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    return saveVideoProject(pending);
  };

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = (next: VideoProject) => {
    pending = next;
    cancel();
    timer = setTimeout(() => {
      void saveVideoProject(pending);
    }, delayMs);
  };

  schedule(project);
  return {
    cancel,
    flush: async () => {
      cancel();
      return flush();
    },
  };
}

export const VIDEO_PROJECT_AUTOSAVE_MS = 2500;
