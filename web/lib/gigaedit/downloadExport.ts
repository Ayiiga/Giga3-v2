/** Trigger a real browser download for an exported File/Blob. */

export function downloadExportedFile(file: File, fallbackName = "gigaedit-export"): void {
  if (typeof window === "undefined") {
    throw new Error("Download is only available in the browser.");
  }
  if (!file.size) {
    throw new Error("Export file is empty — nothing to download.");
  }
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name || fallbackName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function shareExportedFile(file: File, caption?: string): Promise<"shared" | "downloaded"> {
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "GigaEdit export",
      text: caption || "Made with GigaEdit on Giga3 AI",
    });
    return "shared";
  }
  downloadExportedFile(file);
  return "downloaded";
}
