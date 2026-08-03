import type { ExportAspectRatio } from "@/lib/gigaedit/types";

export function aspectRatioCss(ratio: ExportAspectRatio): string {
  switch (ratio) {
    case "9:16":
      return "9 / 16";
    case "16:9":
      return "16 / 9";
    case "1:1":
      return "1 / 1";
    case "4:5":
      return "4 / 5";
    case "4:3":
      return "4 / 3";
    default:
      return "9 / 16";
  }
}

export function aspectRatioSize(ratio: ExportAspectRatio): { width: number; height: number } {
  switch (ratio) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "16:9":
      return { width: 1920, height: 1080 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "4:5":
      return { width: 1080, height: 1350 };
    case "4:3":
      return { width: 1440, height: 1080 };
    default:
      return { width: 1080, height: 1920 };
  }
}
