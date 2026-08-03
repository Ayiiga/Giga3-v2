import type { IntelligentNotificationCategory } from "@/lib/intelligentNotifications/types";

function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return "";
  return (pathname.split("?")[0] || "").replace(/\/$/, "") || "/";
}

/** Local badge categories cleared when the user opens a related section. */
export function categoriesForPath(
  pathname: string | null | undefined
): IntelligentNotificationCategory[] {
  const path = normalizePath(pathname);
  if (!path) return [];

  if (path.startsWith("/chat/login") || path.startsWith("/chat/share")) {
    return [];
  }

  const cats: IntelligentNotificationCategory[] = [];

  if (path === "/chat" || path.startsWith("/chat/")) {
    cats.push("messages");
  }
  if (path === "/gigasocial" || path.startsWith("/gigasocial/")) {
    cats.push("social", "creator");
  }
  if (path === "/media" || path.startsWith("/media/")) {
    cats.push("studio");
  }
  if (path === "/gigalearn" || path.startsWith("/gigalearn/")) {
    cats.push("learning");
  }
  if (path === "/home" || path.startsWith("/home/") || path === "/workspace" || path.startsWith("/workspace/")) {
    cats.push("system");
  }

  return cats;
}
