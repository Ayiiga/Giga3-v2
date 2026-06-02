/**
 * Server-only Replicate helpers for Next.js API routes.
 * Primary media generation runs in Convex (`convex/media.ts`).
 */
import "server-only";

export function getReplicateToken(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }
  return token;
}

export const REPLICATE_ENV_VARS = [
  "REPLICATE_API_TOKEN",
  "REPLICATE_IMAGE_MODEL",
  "REPLICATE_VIDEO_MODEL",
] as const;
