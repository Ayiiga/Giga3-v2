/** Client-side handle guess for feed ownership checks — matches server normalizeSocialHandle. */
export function handleFromEmail(email: string | null | undefined): string | undefined {
  if (!email?.trim()) return undefined;
  const local = email.split("@")[0] ?? "user";
  const handle = local
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return handle || undefined;
}
