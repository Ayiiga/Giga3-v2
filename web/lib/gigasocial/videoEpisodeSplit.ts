import { SOCIAL_MAX_VIDEO_BYTES, SOCIAL_MAX_VIDEO_DURATION_SEC } from "@/lib/gigasocial/constants";
import { formatVideoTime, trimVideoFile, type VideoTrimRange } from "@/lib/gigasocial/videoTrim";

export const SOCIAL_EPISODE_SPLIT_COUNT = 3;
/** Prefer episode split when the file is oversized and long enough to cut into parts. */
export const SOCIAL_EPISODE_SPLIT_MIN_DURATION_SEC = 45;

export type VideoEpisodePlanItem = {
  index: number;
  range: VideoTrimRange;
  durationSec: number;
  suggestedTitle: string;
};

export type VideoEpisodePlan = {
  episodeCount: number;
  sourceDurationSec: number;
  sourceSizeBytes: number;
  items: VideoEpisodePlanItem[];
};

export type ConfirmedVideoEpisode = {
  index: number;
  title: string;
  range: VideoTrimRange;
  durationSec: number;
};

function stripHashtags(text: string): string {
  return text
    .replace(/#[\p{L}\p{N}_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHashtagSuffix(text: string): string {
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  if (!tags.length) return "";
  const unique: string[] = [];
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (!unique.some((existing) => existing.toLowerCase() === lower)) {
      unique.push(tag);
    }
  }
  return unique.slice(0, 8).join(" ");
}

/** Base title for episode naming (caption without hashtags, capped for mobile inputs). */
export function episodeSeriesBaseTitle(caption: string, fileName?: string): string {
  const cap = (value: string, max = 42) =>
    value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
  const fromCaption = stripHashtags(caption).replace(/^["'“”]+|["'“”]+$/g, "").trim();
  if (fromCaption.length >= 3) {
    return cap(fromCaption);
  }
  const fromFile = (fileName ?? "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (fromFile.length >= 3) {
    return cap(fromFile);
  }
  return "Untitled series";
}

export function suggestEpisodeTitle(baseTitle: string, index: number, episodeCount: number): string {
  return `${baseTitle} — Ep ${index + 1}/${episodeCount}`;
}

export function buildEpisodePostBody(
  title: string,
  originalCaption: string,
  index: number,
  episodeCount: number
): string {
  const tags = extractHashtagSuffix(originalCaption);
  const lines = [
    title.trim(),
    "",
    `🎬 Episode ${index + 1} of ${episodeCount}`,
  ];
  if (tags) lines.push("", tags);
  return lines.join("\n").trim();
}

export function formatBytesShort(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isVideoOverSizeLimit(sizeBytes: number, maxBytes = SOCIAL_MAX_VIDEO_BYTES): boolean {
  return Number.isFinite(sizeBytes) && sizeBytes > maxBytes;
}

export function shouldOfferEpisodeSplit(
  sizeBytes: number,
  durationSec: number,
  maxBytes = SOCIAL_MAX_VIDEO_BYTES
): boolean {
  if (!Number.isFinite(durationSec) || durationSec < SOCIAL_EPISODE_SPLIT_MIN_DURATION_SEC) {
    return false;
  }
  return isVideoOverSizeLimit(sizeBytes, maxBytes);
}

export function canOptionalEpisodeSplit(durationSec: number): boolean {
  return Number.isFinite(durationSec) && durationSec >= SOCIAL_EPISODE_SPLIT_MIN_DURATION_SEC * 2;
}

/**
 * Divide a source video into equal-time episodes (default 3).
 * Ranges stay within the social duration cap per episode.
 */
export function planVideoEpisodes(args: {
  durationSec: number;
  sizeBytes: number;
  caption?: string;
  fileName?: string;
  episodeCount?: number;
  maxEpisodeSec?: number;
}): VideoEpisodePlan {
  const episodeCount = Math.max(2, Math.min(6, args.episodeCount ?? SOCIAL_EPISODE_SPLIT_COUNT));
  const maxEpisodeSec = args.maxEpisodeSec ?? SOCIAL_MAX_VIDEO_DURATION_SEC;
  const sourceDurationSec = Math.max(0, args.durationSec);
  if (sourceDurationSec < SOCIAL_EPISODE_SPLIT_MIN_DURATION_SEC) {
    throw new Error(
      `Video is too short to split into episodes (need at least ${SOCIAL_EPISODE_SPLIT_MIN_DURATION_SEC}s).`
    );
  }

  const baseTitle = episodeSeriesBaseTitle(args.caption ?? "", args.fileName);
  const sliceLen = sourceDurationSec / episodeCount;
  if (sliceLen > maxEpisodeSec + 0.05) {
    throw new Error(
      `Each episode would exceed ${Math.round(maxEpisodeSec / 60)} minutes. Trim the source first.`
    );
  }

  const items: VideoEpisodePlanItem[] = [];
  for (let i = 0; i < episodeCount; i += 1) {
    const startSec = i * sliceLen;
    const endSec = i === episodeCount - 1 ? sourceDurationSec : (i + 1) * sliceLen;
    const durationSec = Math.max(0.5, endSec - startSec);
    items.push({
      index: i,
      range: { startSec, endSec },
      durationSec,
      suggestedTitle: suggestEpisodeTitle(baseTitle, i, episodeCount),
    });
  }

  return {
    episodeCount,
    sourceDurationSec,
    sourceSizeBytes: args.sizeBytes,
    items,
  };
}

export function describeEpisodeRange(item: Pick<VideoEpisodePlanItem, "range" | "durationSec">): string {
  return `${formatVideoTime(item.range.startSec)}–${formatVideoTime(item.range.endSec)} (${formatVideoTime(item.durationSec)})`;
}

/**
 * Re-encode each planned episode with the existing browser trim pipeline.
 * Runs sequentially to avoid saturating mobile CPUs / memory.
 */
export async function exportVideoEpisodes(
  file: File,
  episodes: ConfirmedVideoEpisode[],
  options?: {
    onProgress?: (args: {
      episodeIndex: number;
      episodeCount: number;
      episodePercent: number;
      overallPercent: number;
    }) => void;
    signal?: AbortSignal;
    /** Shared blob URL for the source file (avoids extra decode handles on mobile). */
    objectUrl?: string;
  }
): Promise<Array<{ file: File; durationSec: number; index: number; title: string }>> {
  const results: Array<{ file: File; durationSec: number; index: number; title: string }> = [];
  const episodeCount = episodes.length;

  for (let i = 0; i < episodeCount; i += 1) {
    if (options?.signal?.aborted) {
      throw new Error("Episode export cancelled.");
    }
    const episode = episodes[i];
    const exported = await trimVideoFile(file, episode.range, {
      signal: options?.signal,
      objectUrl: options?.objectUrl,
      onProgress: (percent) => {
        const episodePercent = Math.round(percent * 100);
        const overallPercent = Math.round(((i + percent) / episodeCount) * 100);
        options?.onProgress?.({
          episodeIndex: i,
          episodeCount,
          episodePercent,
          overallPercent,
        });
      },
    });

    const ext = exported.file.name.split(".").pop() || "webm";
    const safeBase =
      episode.title
        .replace(/[^\w\s-]+/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 48)
        .replace(/^-+|-+$/g, "") || `episode-${i + 1}`;
    const named = new File([exported.file], `${safeBase}.${ext}`, {
      type: exported.file.type,
    });

    results.push({
      file: named,
      durationSec: exported.durationSec,
      index: episode.index,
      title: episode.title,
    });
  }

  return results;
}
