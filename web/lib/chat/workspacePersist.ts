/** Persist chat workspace UI so launch restores the last session context. */

const ACTIVE_ID_KEY = "giga3_chat_active_id";
const SIDEBAR_COLLAPSED_KEY = "giga3_chat_sidebar_collapsed";

export function readActiveConversationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function writeActiveConversationId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!id) localStorage.removeItem(ACTIVE_ID_KEY);
    else localStorage.setItem(ACTIVE_ID_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}
