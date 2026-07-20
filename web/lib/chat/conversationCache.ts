import type { ConversationItem } from "@/components/chat/ChatSidebar";

const DB_NAME = "giga3-chat-cache";
const CONVERSATIONS_STORE = "conversations";
const DB_VERSION = 1;
const SESSION_KEY = "giga3_conv_cache";

type CachedConversations = {
  conversations: ConversationItem[];
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        db.createObjectStore(CONVERSATIONS_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export function readCachedConversationsSync(): ConversationItem[] | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedConversations;
    if (!Array.isArray(parsed.conversations)) return null;
    return parsed.conversations;
  } catch {
    return null;
  }
}

export async function readCachedConversations(): Promise<ConversationItem[] | null> {
  const sync = readCachedConversationsSync();
  if (typeof indexedDB === "undefined") return sync;
  try {
    const db = await openDb();
    const fromIdb = await new Promise<ConversationItem[] | null>((resolve, reject) => {
      const tx = db.transaction(CONVERSATIONS_STORE, "readonly");
      const req = tx.objectStore(CONVERSATIONS_STORE).get("list");
      req.onsuccess = () => {
        const row = req.result as CachedConversations | undefined;
        resolve(row?.conversations ?? null);
      };
      req.onerror = () => reject(req.error ?? new Error("read conversations failed"));
    });
    return fromIdb ?? sync;
  } catch {
    return sync;
  }
}

export async function writeCachedConversations(
  conversations: ConversationItem[]
): Promise<void> {
  if (!conversations.length) return;
  const payload: CachedConversations = {
    conversations,
    savedAt: Date.now(),
  };
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch {
      /* quota */
    }
  }
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CONVERSATIONS_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("write conversations failed"));
      tx.objectStore(CONVERSATIONS_STORE).put(payload, "list");
    });
  } catch {
    /* ignore */
  }
}
