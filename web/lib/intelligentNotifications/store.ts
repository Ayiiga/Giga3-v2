import type {
  IntelligentNotification,
  IntelligentNotificationCategory,
} from "@/lib/intelligentNotifications/types";

const STORE_KEY = "giga3_intelligent_notifications_v1";
const MAX_ITEMS = 80;

function readAll(): IntelligentNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IntelligentNotification[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeAll(items: IntelligentNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    window.dispatchEvent(new CustomEvent("giga3:intelligent-notifications-changed"));
  } catch {
    /* ignore */
  }
}

export function listIntelligentNotifications(): IntelligentNotification[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

/** Alias for reminder engine / service. */
export const listLocalNotifications = listIntelligentNotifications;

export function countUnreadIntelligentNotifications(
  category?: IntelligentNotificationCategory
): number {
  return readAll().filter(
    (item) => !item.readAt && (!category || item.category === category)
  ).length;
}

export function getIntelligentBadgeCounts(): Record<
  IntelligentNotificationCategory,
  number
> {
  const counts: Record<IntelligentNotificationCategory, number> = {
    social: 0,
    messages: 0,
    studio: 0,
    learning: 0,
    creator: 0,
    system: 0,
  };
  for (const item of readAll()) {
    if (!item.readAt) counts[item.category] += 1;
  }
  return counts;
}

export function addIntelligentNotification(
  input: Omit<IntelligentNotification, "id" | "createdAt" | "readAt"> & {
    id?: string;
    createdAt?: number;
  }
): IntelligentNotification {
  const item: IntelligentNotification = {
    id: input.id ?? `intel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: input.category,
    title: input.title,
    body: input.body,
    href: input.href,
    source: input.source,
    dedupeKey: input.dedupeKey,
    createdAt: input.createdAt ?? Date.now(),
    readAt: null,
  };
  const next = [item, ...readAll().filter((row) => row.id !== item.id)].slice(0, MAX_ITEMS);
  writeAll(next);
  return item;
}

/** Alias used by reminder engine. */
export function addLocalNotification(input: {
  category: IntelligentNotificationCategory;
  title: string;
  body: string;
  href?: string;
  dedupeKey?: string;
  source?: IntelligentNotification["source"];
}): IntelligentNotification | null {
  if (input.dedupeKey) {
    const recent = Date.now() - 12 * 60 * 60 * 1000;
    const exists = readAll().some(
      (n) => n.dedupeKey === input.dedupeKey && n.createdAt >= recent
    );
    if (exists) return null;
  }
  return addIntelligentNotification({
    category: input.category,
    title: input.title,
    body: input.body,
    href: input.href,
    dedupeKey: input.dedupeKey,
    source: input.source ?? "local_engine",
  });
}

export function markIntelligentNotificationRead(id: string): void {
  writeAll(
    readAll().map((item) =>
      item.id === id ? { ...item, readAt: item.readAt ?? Date.now() } : item
    )
  );
}

export function markAllIntelligentNotificationsRead(
  category?: IntelligentNotificationCategory
): void {
  const now = Date.now();
  writeAll(
    readAll().map((item) => {
      if (category && item.category !== category) return item;
      if (item.readAt) return item;
      return { ...item, readAt: now };
    })
  );
}

export function clearIntelligentNotifications(
  category?: IntelligentNotificationCategory
): void {
  if (!category) {
    writeAll([]);
    return;
  }
  writeAll(readAll().filter((item) => item.category !== category));
}

export function markIntelligentCategoryViewed(
  category: IntelligentNotificationCategory
): void {
  markAllIntelligentNotificationsRead(category);
}
