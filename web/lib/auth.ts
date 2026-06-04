const STORAGE_KEY = "giga3_user_email";

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

export function setUserEmail(email: string): void {
  localStorage.setItem(STORAGE_KEY, email.trim().toLowerCase());
}

export function clearUserEmail(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
