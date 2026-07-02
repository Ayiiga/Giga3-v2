const STORAGE_KEY = "giga3_user_email";
const SESSION_KEY = "giga3_session_token";
const SUPABASE_ACCESS_KEY = "giga3_supabase_access_token";

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized !== raw) {
    localStorage.setItem(STORAGE_KEY, normalized);
  }
  return normalized;
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(SESSION_KEY);
  return token?.trim() || null;
}

export function setUserEmail(email: string): void {
  localStorage.setItem(STORAGE_KEY, email.trim().toLowerCase());
}

export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token.trim());
}

export function setAuthSession(email: string, sessionToken: string): void {
  setUserEmail(email);
  setSessionToken(sessionToken);
}

export function clearUserEmail(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** Clears all client-side auth/session artifacts (Convex + Supabase bridge). */
export function clearAllClientAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SUPABASE_ACCESS_KEY);
  try {
    sessionStorage.removeItem("giga3_admin_session");
  } catch {
    /* ignore */
  }
}

export function signOutClient(): void {
  clearAllClientAuth();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Returns session token or attempts to issue one for logged-in users. */
export async function ensureSessionToken(
  issueSession: (args: { email: string }) => Promise<{ sessionToken: string }>
): Promise<string | null> {
  const existing = getSessionToken();
  if (existing) return existing;
  const email = getUserEmail();
  if (!email) return null;
  try {
    const { sessionToken } = await issueSession({ email });
    setSessionToken(sessionToken);
    return sessionToken;
  } catch {
    return null;
  }
}
