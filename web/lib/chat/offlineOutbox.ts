const DB_NAME = "giga3-chat-outbox";
const STORE = "pending";
const DB_VERSION = 1;

export type OutboxAttachment = {
  kind: string;
  name: string;
  mimeType?: string;
  sizeBytes: number;
  text?: string;
  dataUrl?: string;
};

export type OutboxEntry = {
  id: string;
  clientRequestId: string;
  conversationId: string | null;
  content: string;
  mode: string;
  attachments?: OutboxAttachment[];
  sessionToken: string;
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

export async function listOutbox(): Promise<OutboxEntry[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result as OutboxEntry[]).sort(
        (a, b) => a.createdAt - b.createdAt
      );
      resolve(rows);
    };
    req.onerror = () => reject(req.error ?? new Error("read outbox failed"));
  });
}

export async function enqueueOutbox(entry: OutboxEntry): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("enqueue failed"));
    tx.objectStore(STORE).put(entry);
  });
}

export async function removeOutbox(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("remove failed"));
    tx.objectStore(STORE).delete(id);
  });
}

export async function bumpOutboxAttempt(
  id: string,
  lastError: string
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  const rows = await listOutbox();
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  await enqueueOutbox({
    ...row,
    attempts: row.attempts + 1,
    lastError,
  });
}

export function registerChatOutboxSync(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.ready
    .then((reg) => {
      if ("sync" in reg) {
        return (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(
          "giga3-chat-outbox"
        );
      }
    })
    .catch(() => null);
}

export function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
