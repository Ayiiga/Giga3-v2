/**
 * API stability helpers — v1 remains the production default.
 * Future v2 clients can opt in without breaking existing endpoints.
 */

export type GigaSocialApiVersion = "v1" | "v2";

const STORAGE_KEY = "giga3_gigasocial_api_version";

export function getDefaultApiVersion(): GigaSocialApiVersion {
  return "v1";
}

export function readPreferredApiVersion(allowV2 = false): GigaSocialApiVersion {
  if (!allowV2) return "v1";
  if (typeof window === "undefined") return "v1";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "v2") return "v2";
  } catch {
    /* ignore */
  }
  return "v1";
}

export function buildGigaSocialApiBase(
  siteUrl: string,
  version: GigaSocialApiVersion = "v1"
): string {
  const site = siteUrl.replace(/\/$/, "");
  // v2 path reserved — still points at v1 until backend ships v2.
  if (version === "v2") {
    return `${site}/gigasocial/api/v1`;
  }
  return `${site}/gigasocial/api/v1`;
}

export const API_COMPATIBILITY_NOTES = [
  "Never break /gigasocial/api/v1/* contracts.",
  "Add new fields as optional; never rename or remove existing response keys.",
  "Feature flags gate gradual rollout of client v2 readiness.",
] as const;
