import { ForbiddenError, UnauthorizedError } from "./securityErrors";
import { verifySessionToken } from "./sessionAuth";
import { normalizeUserId } from "./userIds";

/**
 * Derives the authenticated user from a verified session token.
 * Client-supplied userId/email is ignored unless provided for mismatch checks (403).
 */
export async function requireAuthenticatedEmail(
  sessionToken: string | undefined,
  claimedUserId?: string
): Promise<string> {
  if (!sessionToken?.trim()) {
    throw new UnauthorizedError();
  }
  const email = await verifySessionToken(sessionToken);
  if (claimedUserId !== undefined && claimedUserId.trim() !== "") {
    const claimed = normalizeUserId(claimedUserId);
    if (claimed !== email) {
      throw new ForbiddenError();
    }
  }
  return email;
}

export const sessionTokenValidator = (required = true) =>
  required ? { sessionToken: { type: "string" as const } } : {};
