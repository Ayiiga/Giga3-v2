import { MAX_GIGAEDIT_IMPORT_URLS } from "@/lib/media/videoProject/gigaEditHandoff";
import { fetchAsBlob } from "@/lib/share/clientShare";
import { readVideoDuration } from "@/lib/gigaedit/timelineJoin";

export type RemoteVideoImportFailure = {
  url: string;
  fileName: string;
  reason: string;
};

export type RemoteVideoImportSuccess = {
  file: File;
  sourceUrl: string;
  durationSec: number;
};

export type RemoteVideoImportResult = {
  successes: RemoteVideoImportSuccess[];
  failures: RemoteVideoImportFailure[];
};

/** Parse `clip0`, `clip1`, … query params from a Media Studio / GigaEdit handoff URL. */
export function parseClipUrlsFromSearchParams(params: URLSearchParams): string[] {
  const urls: string[] = [];
  for (let index = 0; index < MAX_GIGAEDIT_IMPORT_URLS; index += 1) {
    const raw = params.get(`clip${index}`)?.trim();
    if (!raw) break;
    urls.push(raw);
  }
  return urls;
}

function fileNameFromUrl(url: string, index: number): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").pop()?.replace(/\.[^.]+$/, "") || `clip-${index + 1}`;
    const ext = pathname.split(".").pop()?.toLowerCase();
    if (ext === "webm" || ext === "mov" || ext === "m4v" || ext === "mp4") {
      return `${base}.${ext}`;
    }
  } catch {
    /* use fallback */
  }
  return `clip-${index + 1}.mp4`;
}

async function remoteUrlToVideoFile(url: string, index: number): Promise<File> {
  const blob = await fetchAsBlob(url);
  if (!blob.size) {
    throw new Error("Downloaded file is empty.");
  }
  const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("quicktime") ? "mov" : "mp4";
  const name = fileNameFromUrl(url, index).replace(/\.[^.]+$/, "") + `.${ext}`;
  return new File([blob], name, { type: blob.type || "video/mp4" });
}

/**
 * Fetch remote video URLs in selection order. Never silently drops URLs — failures are reported.
 */
export async function fetchRemoteVideosForImport(
  urls: string[],
  options?: { maxCount?: number; signal?: AbortSignal }
): Promise<RemoteVideoImportResult> {
  const maxCount = options?.maxCount ?? MAX_GIGAEDIT_IMPORT_URLS;
  const selected = urls.slice(0, maxCount);
  const skipped = urls.length - selected.length;
  const successes: RemoteVideoImportSuccess[] = [];
  const failures: RemoteVideoImportFailure[] = [];

  if (skipped > 0) {
    failures.push({
      url: urls[maxCount] ?? "",
      fileName: `clip-${maxCount + 1}`,
      reason: `Only ${maxCount} clips can be imported at once (${skipped} skipped).`,
    });
  }

  for (let index = 0; index < selected.length; index += 1) {
    if (options?.signal?.aborted) {
      failures.push({
        url: selected[index],
        fileName: fileNameFromUrl(selected[index], index),
        reason: "Import cancelled.",
      });
      break;
    }
    const url = selected[index];
    const fileName = fileNameFromUrl(url, index);
    try {
      const file = await remoteUrlToVideoFile(url, index);
      const durationSec = await readVideoDuration(file);
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        failures.push({
          url,
          fileName,
          reason: "Could not read video duration.",
        });
        continue;
      }
      successes.push({ file, sourceUrl: url, durationSec });
    } catch (err) {
      failures.push({
        url,
        fileName,
        reason: err instanceof Error ? err.message : "Could not download video.",
      });
    }
  }

  return { successes, failures };
}
