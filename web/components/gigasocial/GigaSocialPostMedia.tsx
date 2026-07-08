"use client";

import type { SocialPost } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import { memo, useMemo, useState } from "react";

interface GigaSocialPostMediaProps {
  post: SocialPost;
}

export const GigaSocialPostMedia = memo(function GigaSocialPostMedia({
  post,
}: GigaSocialPostMediaProps) {
  const mediaUrls = useMemo(
    () => post.mediaUrls ?? (post.mediaUrl ? [post.mediaUrl] : []),
    [post.mediaUrl, post.mediaUrls]
  );
  const [activeImage, setActiveImage] = useState(0);

  if (!mediaUrls.length) return null;

  const isVideo =
    post.mediaType === "video" ||
    post.postType === "video" ||
    mediaUrls.length === 1 && Boolean(post.videoDurationSec);

  if (isVideo) {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <video
          src={mediaUrls[0]}
          controls
          playsInline
          preload="metadata"
          poster={post.videoThumbnailUrl}
          className="max-h-96 w-full bg-black object-contain"
          aria-label="Post video"
        />
        {post.videoDurationSec ? (
          <p className="px-3 py-1.5 text-xs text-muted">
            {Math.round(post.videoDurationSec)}s video
          </p>
        ) : null}
      </div>
    );
  }

  if (mediaUrls.length === 1) {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrls[0]}
          alt="Post image"
          className="max-h-96 w-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="overflow-hidden rounded-xl border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrls[activeImage]}
          alt={`Post image ${activeImage + 1} of ${mediaUrls.length}`}
          className="max-h-96 w-full object-contain"
          loading="lazy"
        />
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
              "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border",
              index === activeImage ? "border-accent ring-2 ring-accent/30" : "border-border"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
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
  onRemoveImage: (id: string) => void;
  onRemoveVideo: () => void;
}

export const GigaSocialPendingMediaPreview = memo(function GigaSocialPendingMediaPreview({
  images,
  video,
  onRemoveImage,
  onRemoveVideo,
}: PendingMediaPreviewProps) {
  if (!images.length && !video) return null;

  return (
    <div className="mt-3 space-y-2">
      {video ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-black/5">
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt="Video preview"
              className="max-h-48 w-full object-contain"
            />
          ) : (
            <video
              src={video.previewUrl}
              className="max-h-48 w-full object-contain"
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

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.previewUrl}
                alt={image.name}
                className="h-28 w-full object-cover"
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
