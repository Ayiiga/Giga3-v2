/**
 * Device tier + capability probes for adaptive GigaEdit performance.
 * Frontend-only — no backend calls.
 */

export type DeviceTier = "low" | "mid" | "high";

export type GigaEditCapabilities = {
  tier: DeviceTier;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  supportsHdrDisplay: boolean;
  supportsOffscreenCanvas: boolean;
  supportsCreateImageBitmap: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
};

function readDeviceMemory(): number | null {
  if (typeof navigator === "undefined") return null;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof mem === "number" && Number.isFinite(mem) ? mem : null;
}

function readSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(conn?.saveData);
}

/** Best-effort HDR / wide-gamut display detection. */
export function supportsHdrDisplay(): boolean {
  if (typeof window === "undefined" || typeof matchMedia !== "function") return false;
  try {
    return (
      matchMedia("(dynamic-range: high)").matches ||
      matchMedia("(color-gamut: p3)").matches ||
      matchMedia("(color-gamut: rec2020)").matches
    );
  } catch {
    return false;
  }
}

export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === "undefined") return "mid";
  const cores = navigator.hardwareConcurrency || 4;
  const mem = readDeviceMemory();
  const saveData = readSaveData();
  if (saveData || cores <= 2 || (mem !== null && mem <= 2)) return "low";
  if (cores >= 8 && (mem === null || mem >= 6)) return "high";
  return "mid";
}

export function getGigaEditCapabilities(): GigaEditCapabilities {
  const tier = detectDeviceTier();
  return {
    tier,
    hardwareConcurrency: typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
    deviceMemoryGb: readDeviceMemory(),
    supportsHdrDisplay: supportsHdrDisplay(),
    supportsOffscreenCanvas: typeof OffscreenCanvas !== "undefined",
    supportsCreateImageBitmap: typeof createImageBitmap === "function",
    prefersReducedMotion:
      typeof matchMedia === "function"
        ? matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    saveData: readSaveData(),
  };
}

/** Max edge length for interactive preview canvases / analysis. */
export function getPreviewMaxEdge(tier: DeviceTier = detectDeviceTier()): number {
  if (tier === "low") return 720;
  if (tier === "high") return 1440;
  return 1080;
}

/** Max edge for photo export (original quality preserved via separate original blob). */
export function getExportMaxEdge(tier: DeviceTier = detectDeviceTier()): number {
  if (tier === "low") return 1920;
  if (tier === "high") return 4096;
  return 2560;
}

/** How often to re-run adaptive look analysis (ms). */
export function getLookAnalysisIntervalMs(tier: DeviceTier = detectDeviceTier()): number {
  if (tier === "low") return 1200;
  if (tier === "high") return 350;
  return 700;
}
