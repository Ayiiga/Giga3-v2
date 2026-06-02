const STORAGE_KEY = "giga3_user_email";

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
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
