/**
 * Convex deployment URLs for the Next.js app.
 *
 * Convention: use NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL only.
 * These are inlined at build time (`next build` / static export).
 *
 * Set in GitHub Actions secrets, Cloudflare Pages build env (if building on CF),
 * or web/.env.local for local production builds.
 */

const CONVEX_URL_KEY = "NEXT_PUBLIC_CONVEX_URL" as const;
const CONVEX_SITE_URL_KEY = "NEXT_PUBLIC_CONVEX_SITE_URL" as const;

export function getConvexUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  return url || undefined;
}

export function getConvexSiteUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  return url || undefined;
}

export function requireConvexUrl(): string {
  const url = getConvexUrl();
  if (!url) {
    throw new Error(
      `Missing ${CONVEX_URL_KEY}. Set it in GitHub Actions / Cloudflare Pages build env or web/.env.local (from Convex dashboard → Deployment URL).`
    );
  }
  return url;
}

/** Env keys expected in CI and Cloudflare (for docs and validation scripts). */
export const CONVEX_CLIENT_ENV_KEYS = [
  CONVEX_URL_KEY,
  CONVEX_SITE_URL_KEY,
] as const;
