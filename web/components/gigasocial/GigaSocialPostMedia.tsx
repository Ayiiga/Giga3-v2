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
import { GigaSocialMediaLightbox } from "@/components/gigasocial/GigaSocialMediaLightbox";
import {
  StoriesOfflineBadge,
  StoriesOfflineUnavailable,
} from "@/components/gigasocial/stories/StoriesOfflineIndicator";
import { useStoryOfflineMedia } from "@/hooks/useStoryOfflineMedia";
import {
  persistVideoMutedPreference,
  readVideoMutedPreference,
} from "@/lib/gigasocial/videoMutePreference";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import {
  readDataSaverMode,
  readVideoQualityPreference,
  resolveAutoVideoQuality,
  resolveEffectiveDataSaver,
  shouldDeferMediaLoad,
  shouldUseUltraDataSaver,
  videoPreloadForQuality,
} from "@/lib/gigasocial/dataSaver";
import { pickAdaptiveStreamUrl } from "@/lib/gigasocial/adaptiveVideo";

interface GigaSocialPostMediaProps {
  post: SocialPost;
  autoPlay?: boolean;
  paused?: boolean;
  featured?: boolean;
  allowFullView?: boolean;
  /** Stories viewer: resolve cached media for offline replay. */
  offlinePlayback?: boolean;
  className?: string;
  onUserPaused?: () => void;
  onVideoEnded?: () => void;
}

const SLIDESHOW_MS = 4500;

export const GigaSocialPostMedia = memo(function GigaSocialPostMedia({
  post,
  autoPlay = false,
  paused = false,
  featured = false,
  allowFullView = false,
  offlinePlayback = false,
  className,
  onUserPaused,
  onVideoEnded,
}: GigaSocialPostMediaProps) {
  const features = useGigaSocialFeatures();
  const { saveData, isSlowNetwork } = useConnectionQuality();
  const mediaUrls = useMemo(() => getPostMediaUrls(post), [post]);
  const mediaKind = useMemo(() => getPostMediaKind(post), [post]);
  const offlineMedia = useStoryOfflineMedia(post, { enabled: offlinePlayback });
  const imageFilterStyle = useMemo(
    () => ({ filter: getCameraFilterCss(getPostImageFilterId(post)) }),
    [post]
  );
  const dataSaverMode = useMemo(() => {
    if (!features.enableDataSaver) return "off" as const;
    return resolveEffectiveDataSaver(readDataSaverMode(), { saveData, isSlowNetwork });
  }, [features.enableDataSaver, isSlowNetwork, saveData]);
  const videoQuality = useMemo(() => {
    if (!features.enableDataSaver) return "auto" as const;
    return resolveAutoVideoQuality(dataSaverMode, readVideoQualityPreference(), {
      isSlowNetwork,
      saveData,
    });
  }, [dataSaverMode, features.enableDataSaver, isSlowNetwork, saveData]);
  const primaryMediaUrl = offlinePlayback && offlineMedia.mediaUrl
    ? offlineMedia.mediaUrl
    : mediaUrls[0];
  const adaptive = useMemo(
    () => pickAdaptiveStreamUrl(primaryMediaUrl, undefined, videoQuality),
    [primaryMediaUrl, videoQuality]
  );
  const videoPosterUrl = offlinePlayback
    ? offlineMedia.posterUrl ?? post.videoThumbnailUrl
    : post.videoThumbnailUrl;
  const [activeImage, setActiveImage] = useState(0);
  const [muted, setMuted] = useState(false);
  const [browserMuted, setBrowserMuted] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [mediaUnlocked, setMediaUnlocked] = useState(false);
  const [forceFullVideo, setForceFullVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const effectiveMuted = muted || browserMuted;
  const shouldPlay = autoPlay && !paused;
  const deferMedia =
    features.enableDataSaver &&
    shouldDeferMediaLoad(dataSaverMode) &&
    !mediaUnlocked &&
    !featured &&
    !shouldPlay;
  const ultraSaver = features.enableDataSaver && shouldUseUltraDataSaver(dataSaverMode);
  const videoSrc = adaptive.url;
  const audioOnlyPlayback =
    !forceFullVideo && (adaptive.audioOnly || (ultraSaver && mediaKind === "video"));
  const videoPreload = videoPreloadForQuality(
    forceFullVideo ? "720p" : videoQuality,
    shouldPlay
  );
  const frameClass = featured
    ? mediaKind === "video"
      ? "w-full bg-black object-contain aspect-[9/16]"
      : "w-full bg-black object-cover aspect-[4/5]"
    : "gigasocial-feed-media-frame w-full bg-black";

  const feedMediaWrapperClass = featured
    ? cn("relative overflow-hidden", className)
    : cn(
        "gigasocial-feed-media relative mt-3 overflow-hidden rounded-xl border border-border",
        allowFullView && "gigasocial-feed-media--expandable",
        mediaKind === "video" && "gigasocial-feed-media--video",
        mediaKind === "gallery" && "gigasocial-feed-media--gallery",
        mediaKind === "photo-music" && "gigasocial-feed-media--photo-music gigasocial-feed-media--gallery",
        className
      );

  const openLightbox = useCallback(
    (url: string) => {
      if (!allowFullView || featured) return;
      setLightboxUrl(url);
    },
    [allowFullView, featured]
  );

  const renderExpandableImage = (
    url: string,
    alt: string,
    imageClass: string,
    eager = false
  ) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={cn(imageClass, allowFullView && !featured && "cursor-zoom-in")}
      style={imageFilterStyle}
      loading={eager ? "eager" : "lazy"}
      onClick={allowFullView && !featured ? () => openLightbox(url) : undefined}
    />
  );

  const lightbox =
    lightboxUrl && allowFullView && !featured ? (
      <GigaSocialMediaLightbox
        imageUrl={lightboxUrl}
        alt="Full size post photo"
        onClose={() => setLightboxUrl(null)}
      />
    ) : null;

  const notifyUserPaused = useCallback(() => {
    onUserPaused?.();
  }, [onUserPaused]);

  useEffect(() => {
    setActiveImage(0);
    setBrowserMuted(false);
    setMuted(readVideoMutedPreference());
    setMediaUnlocked(false);
    setForceFullVideo(false);
  }, [post._id]);

  useEffect(() => {
    if (!shouldPlay || mediaKind !== "image") return;
    const timer = window.setTimeout(() => {
      onVideoEnded?.();
    }, SLIDESHOW_MS);
    return () => window.clearTimeout(timer);
  }, [mediaKind, onVideoEnded, post._id, shouldPlay]);

  useEffect(() => {
    if (!shouldPlay || mediaUrls.length < 2) return;
    if (mediaKind !== "gallery" && mediaKind !== "photo-music") return;

    let frameIndex = 0;
    const timer = window.setInterval(() => {
      if (frameIndex >= mediaUrls.length - 1) {
        onVideoEnded?.();
        return;
      }
      frameIndex += 1;
      setActiveImage(frameIndex);
    }, SLIDESHOW_MS);
    return () => window.clearInterval(timer);
  }, [mediaKind, mediaUrls.length, onVideoEnded, post._id, shouldPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mediaKind !== "video") return;

    if (!shouldPlay) {
      video.pause();
      return;
    }

    video.muted = effectiveMuted;
    void video.play().catch(() => {
      if (!muted) {
        video.muted = true;
        setBrowserMuted(true);
        void video.play().catch(() => {
          /* Browser may block autoplay until interaction */
        });
      }
    });
  }, [effectiveMuted, mediaKind, muted, shouldPlay, primaryMediaUrl, videoSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || (mediaKind !== "audio" && mediaKind !== "photo-music")) return;

    if (!shouldPlay) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => {
      // Unmuted autoplay is often blocked; start muted so the track still runs.
      audio.muted = true;
      void audio.play().catch(() => {
        /* Browser may block until interaction */
      });
    });
  }, [mediaKind, shouldPlay, post._id]);

  if (mediaKind === "none") return null;
  if (!mediaUrls.length && mediaKind !== "audio") return null;

  if (deferMedia) {
    return (
      <div className={feedMediaWrapperClass}>
        <button
          type="button"
          onClick={() => setMediaUnlocked(true)}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 bg-zinc-900 text-white",
            featured ? frameClass : "gigasocial-feed-media-frame min-h-[12rem]"
          )}
          style={
            videoPosterUrl
              ? {
                  backgroundImage: `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.55)), url(${videoPosterUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <Play className="h-8 w-8" aria-hidden />
          <span className="text-xs font-medium">
            {ultraSaver ? "Ultra Data Saver — tap to load" : "Data Saver — tap to load media"}
          </span>
        </button>
      </div>
    );
  }

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
        <>
          <div className={feedMediaWrapperClass}>
            {renderExpandableImage(
              mediaUrls[0],
              "Photo with music",
              imageClass,
              featured && shouldPlay
            )}
            {audioBar}
          </div>
          {lightbox}
        </>
      );
    }

    return (
      <>
      <div className={cn(featured ? "space-y-2" : "mt-3 space-y-2")}>
        <div className={feedMediaWrapperClass}>
          {renderExpandableImage(
            mediaUrls[activeImage],
            `Photo with music ${activeImage + 1} of ${mediaUrls.length}`,
            cn(imageClass, "gigasocial-slideshow-frame"),
            featured && shouldPlay
          )}
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
      {lightbox}
      </>
    );
  }

  if (mediaKind === "video") {
    if (offlinePlayback && offlineMedia.unavailable && !offlineMedia.checkingCache) {
      return (
        <div className={feedMediaWrapperClass}>
          <StoriesOfflineUnavailable />
        </div>
      );
    }

    if (offlinePlayback && offlineMedia.checkingCache && !primaryMediaUrl) {
      return (
        <div className={cn(feedMediaWrapperClass, "flex min-h-[12rem] items-center justify-center")}>
          <p className="text-xs text-white/60">Loading cached story…</p>
        </div>
      );
    }

    if (audioOnlyPlayback) {
      return (
        <div className={feedMediaWrapperClass}>
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 bg-zinc-950 text-white",
              featured ? frameClass : "gigasocial-feed-media-frame min-h-[12rem]"
            )}
            style={
              videoPosterUrl
                ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,.5), rgba(0,0,0,.65)), url(${videoPosterUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <Music2 className="h-8 w-8" aria-hidden />
            <p className="text-xs font-medium">Audio only · Data Saver</p>
            {videoSrc ? (
              <audio
                ref={audioRef}
                src={videoSrc}
                controls
                preload="metadata"
                className="w-[90%]"
                aria-label="Post audio"
              />
            ) : null}
            <button
              type="button"
              onClick={() => {
                setForceFullVideo(true);
                setMediaUnlocked(true);
              }}
              className="rounded-full border border-white/30 px-3 py-1 text-[11px]"
            >
              Load video
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={feedMediaWrapperClass}>
        {offlineMedia.offlineAvailable ? (
          <div className="absolute left-3 top-3 z-10">
            <StoriesOfflineBadge />
          </div>
        ) : null}
        <video
          ref={videoRef}
          src={videoSrc ?? primaryMediaUrl}
          controls={!featured}
          playsInline
          autoPlay={shouldPlay}
          preload={videoPreload}
          poster={videoPosterUrl}
          muted={effectiveMuted}
          className={featured ? frameClass : "gigasocial-feed-media-frame"}
          aria-label="Post video"
          onPause={(event) => {
            if (!event.currentTarget.ended && shouldPlay) notifyUserPaused();
          }}
          onEnded={() => {
            if (shouldPlay) onVideoEnded?.();
          }}
        />
        {shouldPlay ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setMuted((value) => {
                const next = !value;
                persistVideoMutedPreference(next);
                if (!next) setBrowserMuted(false);
                return next;
              });
            }}
            onTouchStart={(event) => event.stopPropagation()}
            onTouchEnd={(event) => event.stopPropagation()}
            className={cn(
              "gigasocial-video-mute-btn absolute z-10 inline-flex items-center justify-center rounded-full text-white",
              featured
                ? "gigasocial-video-mute-btn--featured bottom-4 right-4 min-h-12 gap-1.5 px-3.5 py-2"
                : "bottom-3 right-3 h-9 w-9 bg-black/55"
            )}
            aria-label={effectiveMuted ? "Unmute video" : "Mute video"}
          >
            {effectiveMuted ? (
              <VolumeX className={featured ? "h-5 w-5 shrink-0" : "h-4 w-4"} aria-hidden />
            ) : (
              <Volume2 className={featured ? "h-5 w-5 shrink-0" : "h-4 w-4"} aria-hidden />
            )}
            {featured && effectiveMuted ? (
              <span className="text-xs font-semibold leading-none">Sound</span>
            ) : null}
          </button>
        ) : null}
        {post.videoDurationSec && !featured ? (
          <p className="px-3 py-1.5 text-xs text-muted">
            {Math.round(post.videoDurationSec)}s video
            {videoQuality !== "auto" ? ` · ${videoQuality}` : ""}
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
      <>
        <div className={feedMediaWrapperClass}>
          {renderExpandableImage(
            mediaUrls[0],
            "Post image",
            featured ? frameClass : "gigasocial-feed-media-frame",
            featured && shouldPlay
          )}
        </div>
        {lightbox}
      </>
    );
  }

  return (
    <>
    <div className={cn(featured ? "space-y-2" : "mt-3 space-y-2")}>
      <div className={feedMediaWrapperClass}>
        {renderExpandableImage(
          mediaUrls[activeImage],
          `Post image ${activeImage + 1} of ${mediaUrls.length}`,
          featured ? frameClass : "gigasocial-feed-media-frame",
          featured && shouldPlay
        )}
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
    {lightbox}
    </>
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
  compact?: boolean;
}

export const GigaSocialPendingMediaPreview = memo(function GigaSocialPendingMediaPreview({
  images,
  video,
  audio,
  imageFilterId = "none",
  onRemoveImage,
  onRemoveVideo,
  onRemoveAudio,
  compact = false,
}: PendingMediaPreviewProps) {
  const imageFilterStyle = { filter: getCameraFilterCss(imageFilterId) };
  if (!images.length && !video && !audio) return null;

  const videoMax = compact ? "max-h-36" : "max-h-64";
  const imageMax = compact ? "aspect-square max-h-28" : "aspect-[4/5] max-h-44";

  return (
    <div className={cn(compact ? "mt-2 space-y-1.5" : "mt-3 space-y-2")}>
      {video ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-black/5">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt="Video preview"
              className={cn("w-full object-contain", videoMax)}
            />
          ) : (
            <video
              src={video.previewUrl}
              className={cn("w-full object-contain", videoMax)}
              muted
              playsInline
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/50 p-2 text-white">
              <Play className="h-5 w-5" aria-hidden />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-muted">
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
        <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
          {images.map((image) => (
            <div key={image.id} className="relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.previewUrl}
                alt={image.name}
                className={cn("w-full object-cover", imageMax)}
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
