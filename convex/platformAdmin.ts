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
  return getPlatformAdminEmails().includes(normalized);
}
