/** GigaSocial offline action queue — separate from chat outbox IndexedDB. */

const DB_NAME = "giga3-social-outbox";
const STORE = "pending";
const DB_VERSION = 1;

export type SocialOutboxAction =
  | "like"
  | "unlike"
  | "comment"
  | "follow"
  | "unfollow"
  | "create_post";

export type SocialOutboxEntry = {
  id: string;
  action: SocialOutboxAction;
  postId?: string;
  creatorId?: string;
  body?: string;
  postType?: string;
  communitySlug?: string;
  attempts: number;
  createdAt: number;
  lastError?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function listSocialOutbox(): Promise<SocialOutboxEntry[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result as SocialOutboxEntry[]).sort(
        (a, b) => a.createdAt - b.createdAt
      );
      resolve(rows);
    };
    req.onerror = () => reject(req.error ?? new Error("read social outbox failed"));
  });
}

/** Stable key so reconnect sync does not duplicate the same offline action. */
export function socialOutboxDedupeKey(
  entry: Pick<SocialOutboxEntry, "action" | "postId" | "creatorId" | "body" | "postType" | "communitySlug">
): string {
  return [
    entry.action,
    entry.postId ?? "",
    entry.creatorId ?? "",
    entry.postType ?? "",
    entry.communitySlug ?? "",
    (entry.body ?? "").trim(),
  ].join("|");
}

export async function enqueueSocialOutbox(
  entry: Omit<SocialOutboxEntry, "id" | "attempts" | "createdAt"> & {
    id?: string;
    attempts?: number;
    createdAt?: number;
  }
): Promise<SocialOutboxEntry> {
  const existing = await listSocialOutbox();
  const dedupe = socialOutboxDedupeKey(entry);
  const match = existing.find((row) => socialOutboxDedupeKey(row) === dedupe);
  const full: SocialOutboxEntry = {
    id: entry.id ?? match?.id ?? newSocialOutboxId(),
    action: entry.action,
    postId: entry.postId,
    creatorId: entry.creatorId,
    body: entry.body,
    postType: entry.postType,
    communitySlug: entry.communitySlug,
    attempts: entry.attempts ?? match?.attempts ?? 0,
    createdAt: entry.createdAt ?? match?.createdAt ?? Date.now(),
    lastError: entry.lastError ?? match?.lastError,
  };
  if (typeof indexedDB === "undefined") return full;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("enqueue social outbox failed"));
    tx.objectStore(STORE).put(full);
  });
  return full;
}

export async function removeSocialOutbox(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("remove social outbox failed"));
    tx.objectStore(STORE).delete(id);
  });
}

export async function bumpSocialOutboxAttempt(
  id: string,
  lastError: string
): Promise<void> {
  const rows = await listSocialOutbox();
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  await enqueueSocialOutbox({
    ...row,
    attempts: row.attempts + 1,
    lastError,
  });
}

export function newSocialOutboxId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `social-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function registerSocialOutboxSync(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.ready
    .then((reg) => {
      if ("sync" in reg) {
        return (
          reg as ServiceWorkerRegistration & {
            sync: { register: (tag: string) => Promise<void> };
          }
        ).sync.register("giga3-social-outbox");
      }
    })
    .catch(() => null);
}
