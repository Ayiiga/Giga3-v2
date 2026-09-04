"use client";

import { cn } from "@/lib/utils";
import { Loader2, Maximize2, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MediaVideoPlayerProps {
  url: string;
  className?: string;
  /** Accessible label for the play overlay. */
  label?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function MediaVideoPlayer({
  url,
  className,
  label = "Play video",
}: MediaVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const syncTime = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
  }, []);

  useEffect(() => {
    setPlaying(false);
    setLoading(true);
    setError(false);
    setCurrentTime(0);
    setDuration(0);
  }, [url]);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
      setPlaying(true);
    } catch {
      setError(true);
    }
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) pause();
    else void play();
  }, [pause, play, playing]);

  const seek = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(value)) return;
    video.currentTime = value;
    setCurrentTime(value);
  }, []);

  const enterFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      void video.requestFullscreen();
      return;
    }
    const webkit = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    webkit.webkitEnterFullscreen?.();
  }, []);

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-black",
        className
      )}
    >
      <video
        ref={videoRef}
        src={url}
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
        onLoadedData={() => {
          setLoading(false);
          syncTime();
        }}
        onLoadedMetadata={syncTime}
        onTimeUpdate={syncTime}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Loader2 className="h-8 w-8 animate-spin text-white/85" aria-hidden />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/85">
          Could not load this video on your connection.
        </div>
      )}

      {!playing && !error && !loading && (
        <button
          type="button"
          onClick={() => void play()}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
          aria-label={label}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg ring-4 ring-white/25 sm:h-16 sm:w-16">
            <Play className="ml-0.5 h-7 w-7 fill-current sm:h-8 sm:w-8" aria-hidden />
          </span>
        </button>
      )}

      {playing && !error && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              aria-label={playing ? "Pause video" : "Play video"}
            >
              {playing ? (
                <Pause className="h-4 w-4 fill-current" aria-hidden />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-white"
              aria-label="Seek"
            />
            <span className="shrink-0 text-[11px] tabular-nums text-white/90">
              {formatTime(currentTime)}
              {duration > 0 ? ` / ${formatTime(duration)}` : ""}
            </span>
            <button
              type="button"
              onClick={enterFullscreen}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              aria-label="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
