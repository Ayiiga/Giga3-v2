import { shareFiles, triggerDownload } from "@/lib/share/clientShare";

/** How a device-save attempt finished — gallery save is never OS-verified. */
export type DeviceSaveOutcome = "shared" | "downloaded" | "cancelled";

export type DeviceSaveResult = {
  outcome: DeviceSaveOutcome;
};

/** Trigger a real browser download for an exported File/Blob. */
export function downloadExportedFile(file: File, fallbackName = "gigaedit-export"): void {
  if (typeof window === "undefined") {
    throw new Error("Download is only available in the browser.");
  }
  if (!file.size) {
    throw new Error("Export file is empty — nothing to download.");
  }
  const result = triggerDownload(file, file.name || fallbackName);
  if (!result.ok) {
    throw new Error(result.reason || "Download failed.");
  }
}

/**
 * Attempt share-sheet delivery, or fall back to a browser download when share
 * is unavailable. Cancelled share sheets do **not** fall through to download
 * (callers can invite the user to retry). Gallery persistence is never proven.
 */
export async function saveExportedFileToDevice(
  file: File,
  caption?: string
): Promise<DeviceSaveResult> {
  if (!file.size) {
    throw new Error("Export file is empty — nothing to save.");
  }

  const shared = await shareFiles([file], {
    title: "GigaEdit export",
    text: caption || "Made with GigaEdit on Giga3 AI",
  });
  if (shared.ok) return { outcome: "shared" };

  // AbortError from the share sheet — do not treat as a completed save/download.
  if (shared.reason === "Share cancelled") {
    return { outcome: "cancelled" };
  }

  downloadExportedFile(file);
  return { outcome: "downloaded" };
}

/** @deprecated Use saveExportedFileToDevice for mobile gallery support. */
export async function shareExportedFile(
  file: File,
  caption?: string
): Promise<"shared" | "downloaded"> {
  const result = await saveExportedFileToDevice(file, caption);
  if (result.outcome === "cancelled") {
    throw new Error("Share cancelled");
  }
  return result.outcome;
}
