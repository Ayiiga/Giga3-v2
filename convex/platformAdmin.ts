/** Platform owner email — always treated as a platform administrator. */
export const PLATFORM_OWNER_EMAIL = "ayiiga3@gmail.com";

/** Platform administrator emails — set via Convex env `PLATFORM_ADMIN_EMAILS` (comma-separated). */
export function getPlatformAdminEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS?.trim() ?? "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === PLATFORM_OWNER_EMAIL) return true;
  return getPlatformAdminEmails().includes(normalized);
}
