/** Paths where the install prompt must not interrupt the user. */

export function shouldSuppressInstallPrompt(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0] || "";
  return (
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
