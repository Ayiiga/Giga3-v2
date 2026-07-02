const ADMIN_SESSION_KEY = "giga3_admin_session";

export function getAdminSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = sessionStorage.getItem(ADMIN_SESSION_KEY);
    return token?.trim() || null;
  } catch {
    return null;
  }
}

export function setAdminSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, token.trim());
  } catch {
    /* ignore quota */
  }
}

export function clearAdminSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Admin credential object for Convex admin queries/mutations. */
export function adminCredentials():
  | { adminSessionToken: string }
  | "skip" {
  const token = getAdminSessionToken();
  return token ? { adminSessionToken: token } : "skip";
}
