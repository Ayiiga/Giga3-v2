/** Paths where opening the section should clear the installed app badge. */

export function shouldClearAppBadgeForPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = (pathname.split("?")[0] || "").replace(/\/$/, "") || "/";
  if (path.startsWith("/chat/login") || path.startsWith("/chat/share")) {
    return false;
  }
  return (
    path === "/chat" ||
    path.startsWith("/chat/") ||
    path === "/gigasocial" ||
    path.startsWith("/gigasocial/") ||
    path === "/media" ||
    path.startsWith("/media/") ||
    path === "/home" ||
    path.startsWith("/home/") ||
    path === "/workspace" ||
    path.startsWith("/workspace/")
  );
}
