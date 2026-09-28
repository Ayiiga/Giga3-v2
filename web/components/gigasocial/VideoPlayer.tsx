"use client";

import { cn } from "@/lib/utils";
import { Heart, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  likeCount?: number;
  liked?: boolean;
  onLike?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

/** Feed-style video player — 56px pause control, heart top-right, volume bottom-right. */
export const VideoPlayer = memo(function VideoPlayer({
  src,
  poster,
  className,
  autoPlay = false,
  muted: mutedProp = true,
  likeCount = 0,
  liked = false,
  onLike,
  onPause,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(mutedProp);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPlaying(autoPlay);
  }, [autoPlay, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (playing) {
      void video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, [muted, playing, src]);

  const togglePlay = useCallback(() => {
    setPlaying((value) => {
      if (value) onPause?.();
      return !value;
    });
  }, [onPause]);

  const toggleMute = useCallback(() => {
    setMuted((value) => !value);
  }, []);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          if (video.duration > 0) {
            setProgress((video.currentTime / video.duration) * 100);
          }
        }}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      {!playing ? (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 z-20 inline-flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-white"
          aria-label="Play video"
        >
          <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 z-20 inline-flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-white"
          aria-label="Pause video"
        >
          <Pause className="h-6 w-6 fill-current" aria-hidden />
        </button>
      )}

      {onLike ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onLike();
          }}
          className={cn(
            "absolute right-4 top-4 z-30 inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white",
            liked && "text-rose-200"
          )}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} aria-hidden />
          {likeCount > 0 ? <span>{likeCount}</span> : null}
        </button>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          toggleMute();
        }}
        className="absolute bottom-20 right-4 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md"
        aria-label={muted ? "Unmute video" : "Mute video"}
      >
        {muted ? (
          <VolumeX className="h-4 w-4" aria-hidden />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden />
        )}
      </button>

      <div className="absolute inset-x-0 bottom-14 z-20 px-4">
        <div className="h-1 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-[#7C3AED] transition-[width] duration-150"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
});
