import { shareFiles, triggerDownload } from "@/lib/share/clientShare";

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
 * Save to gallery / share sheet on mobile when available, otherwise download.
 * Returns how the file was delivered.
 */
export async function saveExportedFileToDevice(
  file: File,
  caption?: string
): Promise<"shared" | "downloaded"> {
  if (!file.size) {
    throw new Error("Export file is empty — nothing to save.");
  }

  const shared = await shareFiles([file], {
    title: "GigaEdit export",
    text: caption || "Made with GigaEdit on Giga3 AI",
  });
  if (shared.ok) return "shared";

  downloadExportedFile(file);
  return "downloaded";
}

/** @deprecated Use saveExportedFileToDevice for mobile gallery support. */
export async function shareExportedFile(file: File, caption?: string): Promise<"shared" | "downloaded"> {
  return saveExportedFileToDevice(file, caption);
}
