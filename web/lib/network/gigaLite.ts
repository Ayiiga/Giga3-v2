/**
 * App-wide Giga Lite / data saver preferences.
 * Syncs with the existing GigaSocial data saver storage for backward compatibility.
 */
import {
  readDataSaverMode,
  resolveEffectiveDataSaver,
  shouldDeferMediaLoad,
  shouldUseUltraDataSaver,
  writeDataSaverMode,
  type DataSaverMode,
} from "@/lib/gigasocial/dataSaver";

export type GigaLiteMode = "auto" | "standard" | "saver" | "extreme";

const LITE_MODE_KEY = "giga3_lite_mode";

export const GIGA_LITE_OPTIONS: Array<{
  id: GigaLiteMode;
  label: string;
  description: string;
}> = [
  {
    id: "auto",
    label: "Auto",
    description: "Adapt to connection quality and browser data-saver hints.",
  },
  {
    id: "standard",
    label: "Standard",
    description: "Normal Giga3 experience.",
  },
  {
    id: "saver",
    label: "Data Saver",
    description: "Defer images/video, reduce prefetch, lighter animations.",
  },
  {
    id: "extreme",
    label: "Extreme Saver",
    description: "Text-first UI, minimal media, audio-only video where possible.",
  },
];

function liteToDataSaver(mode: GigaLiteMode): DataSaverMode {
  if (mode === "extreme") return "ultra";
  if (mode === "saver") return "saver";
  return "off";
}

function dataSaverToLite(mode: DataSaverMode): GigaLiteMode {
  if (mode === "ultra") return "extreme";
  if (mode === "saver") return "saver";
  return "standard";
}

export function readGigaLiteMode(): GigaLiteMode {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(LITE_MODE_KEY);
    if (raw === "auto" || raw === "standard" || raw === "saver" || raw === "extreme") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  const legacy = readDataSaverMode();
  if (legacy !== "off") return dataSaverToLite(legacy);
  return "auto";
}

export function writeGigaLiteMode(mode: GigaLiteMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LITE_MODE_KEY, mode);
    writeDataSaverMode(liteToDataSaver(mode));
    document.documentElement.dataset.gigaLite = mode;
  } catch {
    /* ignore */
  }
}

export function resolveGigaLiteEffective(opts: {
  saveData?: boolean;
  isSlowNetwork?: boolean;
}): GigaLiteMode {
  const pref = readGigaLiteMode();
  if (pref === "auto") {
    if (opts.saveData || opts.isSlowNetwork) return "saver";
    return "standard";
  }
  return pref;
}

export function effectiveDataSaverMode(opts: {
  saveData?: boolean;
  isSlowNetwork?: boolean;
}): DataSaverMode {
  const pref = readGigaLiteMode();
  if (pref === "auto") {
    return resolveEffectiveDataSaver("off", opts);
  }
  return liteToDataSaver(pref);
}

/** Skip non-critical JS/media prefetch when data saving is active. */
export function shouldAllowBackgroundPrefetch(opts?: {
  saveData?: boolean;
  isSlowNetwork?: boolean;
}): boolean {
  const effective = resolveGigaLiteEffective(opts ?? {});
  return effective === "standard" || effective === "auto";
}

export function shouldReduceVisualEffects(opts?: {
  saveData?: boolean;
  isSlowNetwork?: boolean;
}): boolean {
  const mode = effectiveDataSaverMode(opts ?? {});
  return shouldDeferMediaLoad(mode) || shouldUseUltraDataSaver(mode);
}

export function applyGigaLiteDocumentClass(): void {
  if (typeof document === "undefined") return;
  const mode = readGigaLiteMode();
  document.documentElement.dataset.gigaLite = mode;
  document.documentElement.classList.toggle(
    "giga-lite-saver",
    mode === "saver" || mode === "extreme"
  );
  document.documentElement.classList.toggle("giga-lite-extreme", mode === "extreme");
}
