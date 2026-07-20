/** Platform owner — sole email allowed to see the admin dashboard entry in Settings. */
export const PLATFORM_OWNER_EMAIL = "ayiiga3@gmail.com";

export function isPlatformOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PLATFORM_OWNER_EMAIL;
}
