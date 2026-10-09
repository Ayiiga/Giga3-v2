"use client";

import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/gigalearn/mediaLibrary/filters";
import {
  downloadMediaPack,
  getOfflineMediaPack,
  isOfflinePackComplete,
  removeOfflineMediaPack,
} from "@/lib/gigalearn/mediaLibrary/offlineMedia";
import {
  hasCompletedGame,
  recordMediaProgress,
} from "@/lib/gigalearn/mediaLibrary/mediaProgress";
import type { LearningMediaItem, OfflineMediaPack } from "@/lib/gigalearn/mediaLibrary/types";
import { LANGUAGE_LABELS } from "@/lib/gigalearn/mediaLibrary/types";
import { speakWithGigaLearnVoice } from "@/lib/gigalearn/speechSynthesis";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

interface MediaItemPlayerProps {
  item: LearningMediaItem;
  onClose: () => void;
  onOfflineChange?: () => void;
}

function resolveAssetUrl(
  pack: OfflineMediaPack | null,
  url: string | undefined
): string | undefined {
  if (!url) return undefined;
  const blob = pack?.blobs?.[url]?.dataUrl;
  return blob || url;
}

export function MediaItemPlayer({ item, onClose, onOfflineChange }: MediaItemPlayerProps) {
  const [pack, setPack] = useState<OfflineMediaPack | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [gameDone, setGameDone] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const imageAsset = useMemo(
    () => item.remoteMedia?.find((asset) => asset.mimeType.startsWith("image/")),
    [item.remoteMedia]
  );
  const videoAsset = useMemo(
    () => item.remoteMedia?.find((asset) => asset.mimeType.startsWith("video/")),
    [item.remoteMedia]
  );
  const audioAssets = useMemo(
    () => item.remoteMedia?.filter((asset) => asset.mimeType.startsWith("audio/")) ?? [],
    [item.remoteMedia]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const existing = await getOfflineMediaPack(item.id);
      if (!cancelled) {
        setPack(existing);
        setGameDone(hasCompletedGame(item.id));
      }
      void recordMediaProgress({
        itemId: item.id,
        kind: "viewed",
        subject: item.subject,
        curriculum: item.curriculumLevelId,
        countryId: item.countryId,
      });
    })();
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [item.id, item.subject, item.curriculumLevelId, item.countryId]);

  async function playRecorded(url: string) {
    const src = resolveAssetUrl(pack, url);
    if (!src) return false;
    audioRef.current?.pause();
    const audio = new Audio(src);
    audioRef.current = audio;
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
    });
    return true;
  }

  async function hear(text: string, voiceId: string, narrationIndex: number) {
    setSpeaking(true);
    try {
      const recorded = audioAssets[narrationIndex] ?? audioAssets[0];
      let played = false;
      if (recorded) {
        try {
          played = await playRecorded(recorded.url);
        } catch {
          played = false;
        }
      }
      if (!played) {
        await speakWithGigaLearnVoice({ text, voiceId });
      }
      await recordMediaProgress({
        itemId: item.id,
        kind: "heard",
        subject: item.subject,
        curriculum: item.curriculumLevelId,
        countryId: item.countryId,
      });
    } finally {
      setSpeaking(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const next = await downloadMediaPack(item, { onProgress: setPack });
      setPack(next);
      onOfflineChange?.();
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
      const current = await getOfflineMediaPack(item.id);
      if (current) setPack(current);
    } finally {
      setDownloading(false);
    }
  }

  async function handleRemoveDownload() {
    await removeOfflineMediaPack(item.id);
    setPack(null);
    onOfflineChange?.();
  }

  async function handlePick(option: string) {
    if (!item.game || gameDone) return;
    setPicked(option);
    const correct = option === item.game.answer;
    setFeedback(correct ? item.game.feedbackCorrect : item.game.feedbackWrong);
    if (correct) {
      setGameDone(true);
      await recordMediaProgress({
        itemId: item.id,
        kind: "game_completed",
        score: 100,
        subject: item.subject,
        curriculum: item.curriculumLevelId,
        countryId: item.countryId,
      });
      void hear(item.game.feedbackCorrect, "english", 0);
    }
  }

  const offlineReady = pack ? isOfflinePackComplete(pack) : false;
  const imageSrc = resolveAssetUrl(pack, imageAsset?.url);
  const videoSrc = resolveAssetUrl(pack, videoAsset?.url);

  return (
    <section
      className="rounded-2xl border border-border bg-white p-4 shadow-sm"
      aria-label={item.title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            {item.subject} · {item.topic}
          </p>
          <h3 className="mt-1 text-xl font-bold text-foreground">{item.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 shrink-0 rounded-full border border-border px-3 text-sm font-medium text-muted"
        >
          Close
        </button>
      </div>

      {videoSrc ? (
        <video
          className="mt-4 w-full rounded-2xl border border-[#2A3441] bg-[#1a233f]"
          controls
          playsInline
          preload="metadata"
          poster={imageSrc}
          src={videoSrc}
        >
          <track kind="captions" />
        </video>
      ) : imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export offline data URLs
        <img
          src={imageSrc}
          alt={item.illustration.alt}
          className="mt-4 mx-auto max-h-64 w-auto rounded-2xl border border-[#2A3441] bg-[#1a233f]"
        />
      ) : (
        <div
          className="concrete-object-blend mt-4 flex min-h-[10rem] items-center justify-center rounded-2xl border border-[#2A3441] bg-[#1a233f] text-7xl"
          aria-hidden
        >
          {item.illustration.emoji}
        </div>
      )}
      <p className="sr-only">{item.illustration.alt}</p>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-foreground">Hear the name</p>
        <div className="flex flex-wrap gap-2">
          {item.narrations.map((n, index) => (
            <Button
              key={`${n.language}-${index}`}
              type="button"
              size="sm"
              variant={index === 0 ? "primary" : "secondary"}
              className="min-h-11"
              disabled={speaking}
              onClick={() => void hear(n.text, n.voiceId, index)}
            >
              ▶ {LANGUAGE_LABELS[n.language]}
            </Button>
          ))}
        </div>
      </div>

      {item.game ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
          <p className="text-sm font-semibold text-foreground">Play & practise</p>
          <p className="mt-1 text-sm text-muted">{item.game.prompt}</p>
          <div className="mt-3 grid gap-2">
            {item.game.options.map((option) => {
              const selected = picked === option;
              const correct = option === item.game!.answer;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={gameDone && !correct}
                  onClick={() => void handlePick(option)}
                  className={cn(
                    "min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-medium",
                    selected && correct && "border-emerald-500 bg-emerald-50 text-emerald-900",
                    selected && !correct && "border-rose-300 bg-rose-50 text-rose-900",
                    !selected && "border-border bg-white text-foreground"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {feedback ? (
            <p className="mt-2 text-sm font-medium text-foreground" role="status">
              {feedback}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-border bg-card p-3">
        <p className="text-sm font-semibold text-foreground">Offline</p>
        <p className="mt-1 text-xs text-muted">
          About {formatBytes(item.estimatedOfflineBytes)} ·{" "}
          {offlineReady ? "Saved on this device" : "Not downloaded yet"}
        </p>
        {pack?.status === "downloading" ? (
          <p className="mt-2 text-xs font-medium text-accent" role="status">
            Downloading… {Math.round((pack.progress || 0) * 100)}%
          </p>
        ) : null}
        {downloadError || (pack?.status === "error" && pack.errorMessage) ? (
          <p className="mt-2 text-xs text-rose-700" role="alert">
            {downloadError || pack?.errorMessage}
          </p>
        ) : null}
        {pack?.errorMessage && pack.status === "ready" ? (
          <p className="mt-2 text-xs text-amber-800">{pack.errorMessage}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {!offlineReady ? (
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={downloading || !item.offlineEligible}
              onClick={() => void handleDownload()}
            >
              {downloading ? "Saving…" : "Save for offline"}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-11"
              onClick={() => void handleRemoveDownload()}
            >
              Remove download
            </Button>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-4 text-muted">
          Source: {item.rights.source}. Rights: {item.rights.rights}.
        </p>
      </div>
    </section>
  );
}
