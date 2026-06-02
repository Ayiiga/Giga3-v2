/**
 * Convex deployment URLs — supports Next.js and Expo public env prefixes.
 */
export function getConvexUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_CONVEX_URL ??
    process.env.EXPO_PUBLIC_CONVEX_URL ??
    undefined
  );
}

export function getConvexSiteUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
    undefined
  );
}

export function requireConvexUrl(): string {
  const url = getConvexUrl();
  if (!url) {
    throw new Error(
      "Set NEXT_PUBLIC_CONVEX_URL or EXPO_PUBLIC_CONVEX_URL (from npx convex dev / Convex dashboard)."
    );
  }
  return url;
}
