"use client";

import { formatTimecodeMs } from "@/lib/gigaedit/frameTime";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

type PreviewTransportProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playheadSec: number;
  durationSec: number;
  source: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
};

export function PreviewTransport({ videoRef, playheadSec, durationSec, source, expanded, onToggleExpanded }: PreviewTransportProps) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlaying(!video.paused);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoRef, source]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }

  return (
    <div className="gigaedit-preview-transport flex items-center justify-between gap-3 px-3 py-2">
      <button
        type="button"
        onClick={onToggleExpanded}
        disabled={!source}
        className="gigaedit-editor-icon-btn"
        aria-label={expanded ? "Exit fullscreen preview" : "Fullscreen preview"}
      >
        {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!source}
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
