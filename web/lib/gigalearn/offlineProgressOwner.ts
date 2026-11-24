/** Reads the account from a session token for local cache partitioning only.
 * Convex independently verifies the signature and expiry when uploading progress.
 */
export function offlineProgressOwner(token: string | null): string | null {
  if (!token) return null;
  const [issuer, version, payload, signature, extra] = token.split(".");
  if (issuer !== "giga3" || version !== "v1" || !payload || !signature || extra !== undefined) {
    return null;
  }
  try {
    const binary = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const { email } = JSON.parse(new TextDecoder().decode(bytes));
    return typeof email === "string" ? email.trim().toLowerCase() || null : null;
  } catch {
    return null;
  }
}
