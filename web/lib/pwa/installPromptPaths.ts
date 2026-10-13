/** Paths where install / push overlay prompts must not interrupt the user. */

function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return "";
  return pathname.split("?")[0] || "";
}

/** True on the active chat surface (including nested chat routes). */
export function isChatAppPath(pathname: string | null | undefined): boolean {
  const path = normalizePath(pathname);
  return path === "/chat" || path === "/chat/" || path.startsWith("/chat/");
}

export function shouldSuppressInstallPrompt(pathname: string | null | undefined): boolean {
  const path = normalizePath(pathname);
  if (!path) return false;
  return (
    isChatAppPath(path) ||
    path === "/install" ||
    path === "/install/" ||
    path.startsWith("/chat/login") ||
    path.startsWith("/payment") ||
    path.startsWith("/credits") ||
    path.startsWith("/subscribe") ||
    path.startsWith("/admin") ||
    path.startsWith("/wallet")
  );
}

/** Push permission card — same chat suppression as install (distraction-free chat). */
export function shouldSuppressPushPrompt(pathname: string | null | undefined): boolean {
  return shouldSuppressInstallPrompt(pathname);
}
