/**
 * Low-end device detection for GigaEdits performance mode.
 * Disables expensive glassmorphism on 3G / <4 core phones.
 */

import { detectDeviceTier } from "@/lib/gigaedit/deviceCapability";

export function isSlowNetwork(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const type = conn?.effectiveType?.toLowerCase() ?? "";
  return type === "slow-2g" || type === "2g" || type === "3g";
}

export function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency || 4;
  if (cores < 4) return true;
  return isSlowNetwork();
}

export function shouldUseSolidPanels(): boolean {
  return isLowEndDevice() || detectDeviceTier() === "low";
}
