"use client";

import { Button } from "@/components/ui/Button";
import { SOCIAL_MAX_VIDEO_BYTES } from "@/lib/gigasocial/constants";
import {
  buildEpisodePostBody,
  describeEpisodeRange,
  exportVideoEpisodes,
  formatBytesShort,
  planVideoEpisodes,
  SOCIAL_EPISODE_SPLIT_COUNT,
  type ConfirmedVideoEpisode,
  type VideoEpisodePlan,
} from "@/lib/gigasocial/videoEpisodeSplit";
import { cn } from "@/lib/utils";
import { Clapperboard, Loader2, X } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

export type GigaSocialEpisodeConfirmResult = {
  episodes: Array<{
    file: File;
    durationSec: number;
    title: string;
    body: string;
    index: number;
  }>;
};

type GigaSocialEpisodeConfirmProps = {
  file: File;
  previewUrl: string;
  durationSec: number;
  caption: string;
  reason?: "oversized" | "creator";
  className?: string;
  onCancel: () => void;
  onConfirm: (result: GigaSocialEpisodeConfirmResult) => void;
};

export const GigaSocialEpisodeConfirm = memo(function GigaSocialEpisodeConfirm({
  file,
  previewUrl,
  durationSec,
  caption,
  reason = "oversized",
  className,
  onCancel,
  onConfirm,
}: GigaSocialEpisodeConfirmProps) {
  const abortRef = useRef<AbortController | null>(null);
  const [plan, setPlan] = useState<VideoEpisodePlan | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState("");
  const [exportPercent, setExportPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const next = planVideoEpisodes({
        durationSec,
        sizeBytes: file.size,
        caption,
        fileName: file.name,
        episodeCount: SOCIAL_EPISODE_SPLIT_COUNT,
      });
      setPlan(next);
      setTitles(next.items.map((item) => item.suggestedTitle));
      setPlanError(null);
    } catch (e) {
      setPlan(null);
      setTitles([]);
      setPlanError(e instanceof Error ? e.message : "Could not plan episodes.");
    }
  }, [caption, durationSec, file.name, file.size]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const headline = useMemo(() => {
    if (reason === "oversized") {
      return `This video is ${formatBytesShort(file.size)} (limit ${formatBytesShort(SOCIAL_MAX_VIDEO_BYTES)}). Split it into ${SOCIAL_EPISODE_SPLIT_COUNT} episodes to upload.`;
    }
    return `Divide this video into ${SOCIAL_EPISODE_SPLIT_COUNT} named episodes, then confirm upload.`;
  }, [file.size, reason]);

  async function handleConfirm() {
    if (!plan || exporting) return;
    const trimmedTitles = titles.map((title, index) => {
      const value = title.trim();
      return value || plan.items[index]?.suggestedTitle || `Episode ${index + 1}`;
    });
    if (trimmedTitles.some((title) => !title.trim())) {
      setError("Name each episode before uploading.");
      return;
    }

    setError(null);
    setExporting(true);
    setExportPercent(0);
    setExportLabel(`Preparing episode 1 of ${plan.episodeCount}…`);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const confirmed: ConfirmedVideoEpisode[] = plan.items.map((item, index) => ({
        index: item.index,
        title: trimmedTitles[index],
        range: item.range,
        durationSec: item.durationSec,
      }));

      const exported = await exportVideoEpisodes(file, confirmed, {
        signal: controller.signal,
        onProgress: ({ episodeIndex, episodeCount, overallPercent }) => {
          setExportPercent(overallPercent);
          setExportLabel(`Creating episode ${episodeIndex + 1} of ${episodeCount}…`);
        },
      });

      onConfirm({
        episodes: exported.map((episode) => ({
          file: episode.file,
          durationSec: episode.durationSec,
          title: episode.title,
          body: buildEpisodePostBody(episode.title, caption, episode.index, plan.episodeCount),
          index: episode.index,
        })),
      });
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : "Could not create episodes.");
      }
    } finally {
      abortRef.current = null;
      setExporting(false);
      setExportPercent(0);
      setExportLabel("");
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    onCancel();
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex min-h-0 flex-col bg-[var(--background)] text-[var(--foreground)]",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="episode-confirm-title"
    >
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <button
          type="button"
          onClick={handleCancel}
          disabled={exporting}
          className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          aria-label="Cancel episode split"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 id="episode-confirm-title" className="truncate text-sm font-semibold">
            Confirm {SOCIAL_EPISODE_SPLIT_COUNT} episodes
          </h2>
          <p className="truncate text-xs text-[var(--muted-foreground)]">
            {formatBytesShort(file.size)} · {Math.ceil(durationSec)}s source
          </p>
        </div>
        <Clapperboard className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <p className="text-sm text-[var(--muted-foreground)]">{headline}</p>

        <video
          src={previewUrl}
          className="mx-auto max-h-40 w-full rounded-xl bg-black object-contain"
          controls
          playsInline
          preload="metadata"
        />

        {planError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {planError}
          </p>
        ) : null}

        {plan ? (
          <ul className="space-y-3">
            {plan.items.map((item, index) => (
              <li
                key={item.index}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="font-medium text-[var(--foreground)]">
                    Episode {index + 1}
                  </span>
                  <span>{describeEpisodeRange(item)}</span>
                </div>
                <label className="block space-y-1">
                  <span className="sr-only">Episode {index + 1} title</span>
                  <input
                    type="text"
                    value={titles[index] ?? ""}
                    disabled={exporting}
                    maxLength={120}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTitles((current) => {
                        const next = [...current];
                        next[index] = value;
                        return next;
                      });
                    }}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </label>
              </li>
            ))}
          </ul>
        ) : null}

        {exporting ? (
          <div className="rounded-xl border border-[var(--border)] px-3 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{exportLabel || "Creating episodes…"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full bg-[var(--primary)] transition-[width]"
                style={{ width: `${exportPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </div>

      <footer className="flex gap-2 border-t border-[var(--border)] bg-[var(--background)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" variant="outline" className="flex-1" disabled={exporting} onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-[1.4]"
          disabled={!plan || Boolean(planError) || exporting}
          onClick={() => void handleConfirm()}
        >
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            `Confirm & upload ${SOCIAL_EPISODE_SPLIT_COUNT}`
          )}
        </Button>
      </footer>
    </div>
  );
});
