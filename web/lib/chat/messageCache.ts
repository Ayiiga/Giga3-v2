import type { UiMessage } from "@/components/chat/MessageList";

const DB_NAME = "giga3-chat-cache";
const MESSAGES_STORE = "messages";
const DB_VERSION = 1;
const SESSION_PREFIX = "giga3_msg_cache:";

type CachedThread = {
  messages: UiMessage[];
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (event.oldVersion < 1) {
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          db.createObjectStore(MESSAGES_STORE);
        }
        if (!db.objectStoreNames.contains("conversations")) {
          db.createObjectStore("conversations");
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

/** Fast synchronous read from sessionStorage (same-tab fallback). */
export function readCachedMessages(conversationId: string): UiMessage[] | null {
  if (typeof sessionStorage === "undefined" || !conversationId) return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${conversationId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedThread;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed.messages;
  } catch {
    return null;
  }
}

/** Durable read from IndexedDB — survives tab close for offline viewing. */
export async function readCachedMessagesAsync(
  conversationId: string
): Promise<UiMessage[] | null> {
  const sync = readCachedMessages(conversationId);
  if (typeof indexedDB === "undefined" || !conversationId) return sync;
  try {
    const db = await openDb();
    const fromIdb = await new Promise<UiMessage[] | null>((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, "readonly");
      const req = tx.objectStore(MESSAGES_STORE).get(conversationId);
      req.onsuccess = () => {
        const row = req.result as CachedThread | undefined;
        resolve(row?.messages ?? null);
      };
      req.onerror = () => reject(req.error ?? new Error("read messages failed"));
    });
    return fromIdb ?? sync;
  } catch {
    return sync;
  }
}

export function writeCachedMessages(
  conversationId: string,
  messages: UiMessage[]
): void {
  if (!conversationId || messages.length === 0) return;
  const payload: CachedThread = { messages, savedAt: Date.now() };
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(
        `${SESSION_PREFIX}${conversationId}`,
        JSON.stringify(payload)
      );
    } catch {
      /* quota */
    }
  }
  void writeCachedMessagesAsync(conversationId, messages);
}

export async function writeCachedMessagesAsync(
  conversationId: string,
  messages: UiMessage[]
): Promise<void> {
  if (typeof indexedDB === "undefined" || !conversationId || messages.length === 0) {
    return;
  }
  const payload: CachedThread = { messages, savedAt: Date.now() };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("write messages failed"));
      tx.objectStore(MESSAGES_STORE).put(payload, conversationId);
    });
  } catch {
    /* ignore */
  }
}

export function clearCachedMessages(conversationId: string): void {
  if (typeof sessionStorage !== "undefined" && conversationId) {
    try {
      sessionStorage.removeItem(`${SESSION_PREFIX}${conversationId}`);
    } catch {
      /* ignore */
    }
  }
  if (typeof indexedDB === "undefined" || !conversationId) return;
  void openDb()
    .then((db) => {
      const tx = db.transaction(MESSAGES_STORE, "readwrite");
      tx.objectStore(MESSAGES_STORE).delete(conversationId);
    })
    .catch(() => undefined);
}
