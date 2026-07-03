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

/** Production deployment — see AGENTS.md */
export const CANONICAL_PRODUCTION_CONVEX_URL =
  "https://perfect-lark-521.convex.cloud";

/** Deleted / retired Convex hosts that must never be used at runtime. */
export const RETIRED_CONVEX_HOSTS = new Set([
  "happy-otter-123.convex.cloud",
]);

declare global {
  interface Window {
    __GIGA3_CONVEX_URL__?: string;
  }
}

/** Remap known-dead deployment URLs to production. Safe on server and client. */
export function normalizeConvexUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  try {
    const host = new URL(trimmed).host;
    if (RETIRED_CONVEX_HOSTS.has(host)) {
      return CANONICAL_PRODUCTION_CONVEX_URL;
    }
    return trimmed;
  } catch {
    return undefined;
  }
}

export function getConvexUrl(): string | undefined {
  if (typeof window !== "undefined") {
    const boot = window.__GIGA3_CONVEX_URL__;
    const fromBoot = normalizeConvexUrl(boot);
    if (fromBoot) return fromBoot;
  }
  return normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL);
}

export function getConvexSiteUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (!url) {
    if (getConvexUrl() === CANONICAL_PRODUCTION_CONVEX_URL) {
      return "https://perfect-lark-521.convex.site";
    }
    return undefined;
  }
  try {
    const host = new URL(url).host;
    if (RETIRED_CONVEX_HOSTS.has(host)) {
      return "https://perfect-lark-521.convex.site";
    }
  } catch {
    return undefined;
  }
  return url;
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
