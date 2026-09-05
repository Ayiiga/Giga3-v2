"use client";

import { formatTimecodeMs } from "@/lib/gigaedit/frameTime";
import { Maximize2, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

type PreviewTransportProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playheadSec: number;
  durationSec: number;
};

export function PreviewTransport({ videoRef, playheadSec, durationSec }: PreviewTransportProps) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoRef]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function toggleFullscreen() {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void video.requestFullscreen?.();
  }

  return (
    <div className="gigaedit-preview-transport flex items-center justify-between gap-3 px-3 py-2">
      <button
        type="button"
        onClick={toggleFullscreen}
        className="gigaedit-editor-icon-btn"
        aria-label="Fullscreen preview"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="gigaedit-preview-play-btn"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <p className="truncate text-xs font-medium tabular-nums text-white/90">
          {formatTimecodeMs(playheadSec)}
          <span className="text-white/45"> / </span>
          {formatTimecodeMs(durationSec)}
        </p>
      </div>

      <div className="w-9" aria-hidden />
    </div>
  );
}
