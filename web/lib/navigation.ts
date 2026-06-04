/** Safe post-login redirects (static app routes only). */
export const LOGIN_REDIRECT_PATHS = [
  "/chat",
  "/pricing",
  "/subscribe",
  "/credits",
  "/media",
  "/payment/success",
  "/payment/failed",
] as const;

export type LoginRedirectPath = (typeof LOGIN_REDIRECT_PATHS)[number];

export function sanitizeLoginRedirect(next: string | null | undefined): LoginRedirectPath {
  const fallback: LoginRedirectPath = "/chat";
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  const path = next.split("?")[0]?.split("#")[0] ?? "";
  if ((LOGIN_REDIRECT_PATHS as readonly string[]).includes(path)) {
    return path as LoginRedirectPath;
  }
  return fallback;
}
