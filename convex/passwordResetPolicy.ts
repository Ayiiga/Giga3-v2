"use node";

import { constantTimeEqualHex } from "./authResetLinks";
import { hashResetToken } from "./passwordCryptoNode";

export const RESET_TTL_MS = 60 * 60 * 1000;

export type ResetTokenAssessment = "ok" | "missing" | "expired" | "mismatch";

/** Expiry and constant-time hash check for a single-use reset token. */
export function assessResetToken(input: {
  storedHash: string | undefined;
  expiresAt: number | undefined;
  presentedToken: string;
  now: number;
}): ResetTokenAssessment {
  if (!input.storedHash || !input.expiresAt) return "missing";
  if (input.now > input.expiresAt) return "expired";
  const presented = input.presentedToken.trim();
  if (!presented) return "mismatch";
  const tokenHash = hashResetToken(presented);
  if (!constantTimeEqualHex(tokenHash, input.storedHash)) return "mismatch";
  return "ok";
}
