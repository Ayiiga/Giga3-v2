/** Bump with `npm run generate:branding` when logo/splash/icons change. */
export const BRANDING_ASSET_VERSION = "20260630";

export function brandingAssetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}?v=${BRANDING_ASSET_VERSION}`;
}
