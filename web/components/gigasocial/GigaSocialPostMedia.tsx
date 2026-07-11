"use client";

import { getCameraFilterCss } from "@/lib/gigasocial/cameraFilters";
import {
  getPostAudioUrl,
  getPostImageFilterId,
  getPostMediaKind,
  getPostMediaUrls,
} from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { Music2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface GigaSocialPostMediaProps {
  post: SocialPost;
  autoPlay?: boolean;
  paused?: boolean;
  featured?: boolean;
  className?: string;
  onUserPaused?: () => void;
}

const SLIDESHOW_MS = 4500;

export const GigaSocialPostMedia = memo(function GigaSocialPostMedia({
  post,
  autoPlay = false,
  paused = false,
  featured = false,
  className,
  onUserPaused,
}: GigaSocialPostMediaProps) {
  const mediaUrls = useMemo(() => getPostMediaUrls(post), [post]);
  const mediaKind = useMemo(() => getPostMediaKind(post), [post]);
  const imageFilterStyle = useMemo(
    () => ({ filter: getCameraFilterCss(getPostImageFilterId(post)) }),
    [post]
  );
  const primaryMediaUrl = mediaUrls[0];
  const [activeImage, setActiveImage] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const shouldPlay = autoPlay && !paused;
  const frameClass = featured
    ? mediaKind === "video"
      ? "w-full bg-black object-contain aspect-[9/16] max-h-[min(85vh,44rem)]"
      : "w-full bg-black object-cover aspect-[4/5] max-h-[min(78vh,40rem)]"
    : "gigasocial-feed-media-frame w-full bg-black";

  const feedMediaWrapperClass = featured
    ? cn("relative overflow-hidden", className)
    : cn(
        "gigasocial-feed-media relative mt-3 overflow-hidden rounded-xl border border-border",
        mediaKind === "video" && "gigasocial-feed-media--video",
        mediaKind === "gallery" && "gigasocial-feed-media--gallery",
        mediaKind === "photo-music" && "gigasocial-feed-media--photo-music gigasocial-feed-media--gallery",
        className
      );

  const notifyUserPaused = useCallback(() => {
    onUserPaused?.();
  }, [onUserPaused]);

  useEffect(() => {
    setActiveImage(0);
  }, [post._id]);

  useEffect(() => {
    if (!shouldPlay || mediaUrls.length < 2) return;
    if (mediaKind !== "gallery" && mediaKind !== "photo-music") return;
    const timer = window.setInterval(() => {
      setActiveImage((index) => (index + 1) % mediaUrls.length);
    }, SLIDESHOW_MS);
    return () => window.clearInterval(timer);
  }, [mediaKind, mediaUrls.length, shouldPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mediaKind !== "video") return;

    if (!shouldPlay) {
      video.pause();
      return;
    }

    video.muted = muted;
    void video.play().catch(() => {
      /* Browser may block autoplay until interaction */
    });
  }, [mediaKind, muted, shouldPlay, primaryMediaUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || (mediaKind !== "audio" && mediaKind !== "photo-music")) return;

    if (!shouldPlay) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => {
      /* Browser may block autoplay until interaction */
    });
  }, [mediaKind, shouldPlay, post._id]);

  if (mediaKind === "none") return null;
  if (!mediaUrls.length && mediaKind !== "audio") return null;

  if (mediaKind === "photo-music") {
    const audioUrl = getPostAudioUrl(post);
    const imageClass = featured ? frameClass : "gigasocial-feed-media-frame";
    const audioBar = audioUrl ? (
      <div className="flex items-center gap-3 border-t border-border bg-violet-50/80 px-3 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Music2 className="h-5 w-5" aria-hidden />
        </div>
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          preload="metadata"
          className="min-w-0 flex-1"
          aria-label="Post music"
        />
      </div>
    ) : null;

    if (mediaUrls.length === 1) {
      return (
        <div className={feedMediaWrapperClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrls[0]}
            alt="Photo with music"
            className={imageClass}
            style={imageFilterStyle}
            loading={featured && shouldPlay ? "eager" : "lazy"}
          />
          {audioBar}
        </div>
      );
    }

    return (
      <div className={cn(featured ? "space-y-2" : "mt-3 space-y-2")}>
        <div className={feedMediaWrapperClass}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrls[activeImage]}
            alt={`Photo with music ${activeImage + 1} of ${mediaUrls.length}`}
            className={imageClass}
            style={imageFilterStyle}
            loading={featured && shouldPlay ? "eager" : "lazy"}
          />
          {shouldPlay && mediaUrls.length > 1 ? (
            <div className="absolute bottom-3 left-1/2 flex gap-1.5">
              {mediaUrls.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    index === activeImage ? "bg-white" : "bg-white/40"
                  )}
                  aria-hidden
                />
              ))}
            </div>
          ) : null}
          {audioBar}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Photo gallery">
          {mediaUrls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              role="listitem"
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === activeImage}
              onClick={() => setActiveImage(index)}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border sm:h-16 sm:w-16",
                index === activeImage ? "border-accent ring-2 ring-accent/30" : "border-border"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                style={imageFilterStyle}
                loading="lazy"
              />
              {index === 0 ? (
                <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[10px] text-white">
                  {mediaUrls.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (mediaKind === "video") {
    return (
      <div className={feedMediaWrapperClass}>
        <video
          ref={videoRef}
          src={mediaUrls[0]}
          controls
          playsInline
          preload={shouldPlay ? "auto" : "metadata"}
          poster={post.videoThumbnailUrl}
          muted={muted}
          className={featured ? frameClass : "gigasocial-feed-media-frame"}
          aria-label="Post video"
          onPause={(event) => {
            if (!event.currentTarget.ended && shouldPlay) notifyUserPaused();
          }}
        />
        {shouldPlay ? (
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"
            aria-label={muted ? "Unmute video" : "Mute video"}
          >
            {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
          </button>
        ) : null}
        {post.videoDurationSec && !featured ? (
          <p className="px-3 py-1.5 text-xs text-muted">
            {Math.round(post.videoDurationSec)}s video
          </p>
        ) : null}
      </div>
    );
  }

  if (mediaKind === "audio") {
    const audioUrl = getPostAudioUrl(post);
    if (!audioUrl) return null;
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-violet-900 text-white",
          featured ? "px-4 py-8" : "mt-3 rounded-xl border border-border px-4 py-6"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Music2 className="h-8 w-8" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Audio post</p>
            <p className="truncate text-xs text-violet-200">{post.author.displayName}</p>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              preload={shouldPlay ? "auto" : "metadata"}
              className="mt-3 w-full"
              onPause={(event) => {
                if (!event.currentTarget.ended && shouldPlay) notifyUserPaused();
              }}
            />
          </div>
          {shouldPlay ? (
            <button
              type="button"
              onClick={notifyUserPaused}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"
              aria-label="Pause audio"
            >
              <Pause className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void audioRef.current?.play()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"
              aria-label="Play audio"
            >
              <Play className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mediaKind === "image") {
    return (
      <div className={feedMediaWrapperClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrls[0]}
          alt="Post image"
          className={featured ? frameClass : "gigasocial-feed-media-frame"}
          style={imageFilterStyle}
          loading={featured && shouldPlay ? "eager" : "lazy"}
        />
      </div>
    );
  }

  return (
    <div className={cn(featured ? "space-y-2" : "mt-3 space-y-2")}>
      <div className={feedMediaWrapperClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrls[activeImage]}
          alt={`Post image ${activeImage + 1} of ${mediaUrls.length}`}
          className={featured ? frameClass : "gigasocial-feed-media-frame"}
          style={imageFilterStyle}
          loading={featured && shouldPlay ? "eager" : "lazy"}
        />
        {shouldPlay && mediaUrls.length > 1 ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {mediaUrls.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  index === activeImage ? "bg-white" : "bg-white/40"
                )}
                aria-hidden
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Image gallery">
        {mediaUrls.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            role="listitem"
            aria-label={`Show image ${index + 1}`}
            aria-current={index === activeImage}
            onClick={() => setActiveImage(index)}
            className={cn(
              "relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border sm:h-16 sm:w-16",
              index === activeImage ? "border-accent ring-2 ring-accent/30" : "border-border"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              style={imageFilterStyle}
              loading="lazy"
            />
            {index === 0 && post.mediaType === "gallery" ? (
              <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[10px] text-white">
                {mediaUrls.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
});

interface PendingMediaPreviewProps {
  images: Array<{ id: string; previewUrl: string; name: string }>;
  video?: { previewUrl: string; name: string; durationSec: number; thumbnailUrl?: string };
  audio?: { name: string; durationSec: number };
  imageFilterId?: string;
  onRemoveImage: (id: string) => void;
  onRemoveVideo: () => void;
  onRemoveAudio?: () => void;
}

export const GigaSocialPendingMediaPreview = memo(function GigaSocialPendingMediaPreview({
  images,
  video,
  audio,
  imageFilterId = "none",
  onRemoveImage,
  onRemoveVideo,
  onRemoveAudio,
}: PendingMediaPreviewProps) {
  const imageFilterStyle = { filter: getCameraFilterCss(imageFilterId) };
  if (!images.length && !video && !audio) return null;

  return (
    <div className="mt-3 space-y-2">
      {video ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-black/5">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt="Video preview"
              className="max-h-64 w-full object-contain"
            />
          ) : (
            <video
              src={video.previewUrl}
              className="max-h-64 w-full object-contain"
              muted
              playsInline
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/50 p-2 text-white">
              <Play className="h-5 w-5" aria-hidden />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted">
            <span className="truncate">{video.name}</span>
            <span>{Math.round(video.durationSec)}s</span>
          </div>
          <button
            type="button"
            onClick={onRemoveVideo}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
            aria-label="Remove video"
          >
            Remove
          </button>
        </div>
      ) : null}

      {audio ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-violet-50/80 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-2 truncate text-foreground">
            <Music2 className="h-4 w-4 shrink-0 text-violet-700" aria-hidden />
            {audio.name}
          </span>
          <span className="shrink-0 text-muted">{Math.round(audio.durationSec)}s</span>
          {onRemoveAudio ? (
            <button
              type="button"
              onClick={onRemoveAudio}
              className="shrink-0 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
              aria-label="Remove music"
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.previewUrl}
                alt={image.name}
                className="aspect-[4/5] max-h-44 w-full object-cover"
                style={imageFilterStyle}
              />
              <button
                type="button"
                onClick={() => onRemoveImage(image.id)}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                aria-label={`Remove ${image.name}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
});
