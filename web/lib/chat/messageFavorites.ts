const STORAGE_KEY = "giga3_favorite_messages";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function writeSet(ids: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function isMessageFavorite(messageId: string): boolean {
  return readSet().has(messageId);
}

export function toggleMessageFavorite(messageId: string): boolean {
  const ids = readSet();
  if (ids.has(messageId)) {
    ids.delete(messageId);
    writeSet(ids);
    return false;
  }
  ids.add(messageId);
  writeSet(ids);
  return true;
}

export function listFavoriteMessageIds(): string[] {
  return [...readSet()];
}
