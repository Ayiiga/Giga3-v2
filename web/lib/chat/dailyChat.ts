/** Local-calendar freshness for the chat surface. */

const INTERFACE_DAY_KEY = "giga3_chat_interface_day";

export function localDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function msUntilNextLocalMidnight(date = new Date()): number {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return Math.max(1_000, next.getTime() - date.getTime());
}

/**
 * What to do when the stored chat day is compared with today.
 * The first visit only remembers the day. A later day opens a new chat
 * unless a reply is still in flight.
 */
export function freshChatAction(
  storedDay: string | null,
  today: string,
  busy: boolean
): "remember" | "same" | "wait" | "reset" {
  if (!storedDay) return "remember";
  if (storedDay === today) return "same";
  if (busy) return "wait";
  return "reset";
}

export function readChatInterfaceDay(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(INTERFACE_DAY_KEY);
  } catch {
    return null;
  }
}

export function writeChatInterfaceDay(dayKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INTERFACE_DAY_KEY, dayKey);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Calls onDay now, at the next local midnight, and when the tab becomes visible. */
export function watchLocalDay(onDay: (dayKey: string) => void): () => void {
  let timer = 0;
  const sync = () => {
    window.clearTimeout(timer);
    onDay(localDayKey());
    timer = window.setTimeout(sync, msUntilNextLocalMidnight());
  };
  sync();
  const onVisible = () => {
    if (document.visibilityState === "visible") sync();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
