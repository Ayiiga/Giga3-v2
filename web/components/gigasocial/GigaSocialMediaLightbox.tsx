"use client";

import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Heart, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type LightboxMediaItem = {
  url: string;
  kind?: "image" | "video";
  alt?: string;
};

export const GigaSocialMediaLightbox = memo(function GigaSocialMediaLightbox({
  imageUrl,
  alt,
  items,
  initialIndex = 0,
  onClose,
  onAppreciate,
}: {
  /** @deprecated Prefer `items` — kept for existing call sites. */
  imageUrl?: string;
  alt?: string;
  items?: LightboxMediaItem[];
  initialIndex?: number;
  onClose: () => void;
  /** Double-tap / heart — parent can like the post. */
  onAppreciate?: () => void;
}) {
  const mediaItems = useMemo<LightboxMediaItem[]>(() => {
    if (items?.length) return items;
    if (imageUrl) return [{ url: imageUrl, kind: "image", alt: alt || "Photo" }];
    return [];
  }, [alt, imageUrl, items]);

  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, initialIndex), Math.max(0, mediaItems.length - 1))
  );
  const [scale, setScale] = useState(1);
  const [heartBurst, setHeartBurst] = useState(false);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);

  const current = mediaItems[index];
  const isVideo = current?.kind === "video";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIndex((prev) => Math.min(prev, Math.max(0, mediaItems.length - 1)));
  }, [mediaItems.length]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setIndex((i) => Math.min(mediaItems.length - 1, i + 1));
        setScale(1);
      }
      if (event.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
        setScale(1);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mediaItems.length, onClose]);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(mediaItems.length - 1, i + 1));
    setScale(1);
  }, [mediaItems.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setScale(1);
  }, []);

  const appreciate = useCallback(() => {
    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 700);
    onAppreciate?.();
  }, [onAppreciate]);

  const swipe = useSwipeGesture({
    preferHorizontal: true,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    onSwipeDown: onClose,
    onDoubleTap: isVideo ? undefined : appreciate,
    threshold: 48,
  });

  const onTouchStartPinch = useCallback(
    (event: React.TouchEvent) => {
      swipe.onTouchStart(event);
      if (event.touches.length === 2) {
        const [a, b] = [event.touches[0], event.touches[1]];
        if (!a || !b) return;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchStartDist.current = dist;
        pinchStartScale.current = scale;
      }
    },
    [scale, swipe]
  );

  const onTouchMovePinch = useCallback((event: React.TouchEvent) => {
    if (event.touches.length !== 2 || pinchStartDist.current == null) return;
    const [a, b] = [event.touches[0], event.touches[1]];
    if (!a || !b) return;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const next = Math.min(3, Math.max(1, pinchStartScale.current * (dist / pinchStartDist.current)));
    setScale(next);
  }, []);

  const onTouchEndPinch = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length < 2) {
        pinchStartDist.current = null;
      }
      swipe.onTouchEnd(event);
    },
    [swipe]
  );

  if (!mounted || !current) return null;

  return createPortal(
    <div
      className="gigasocial-media-lightbox fixed inset-0 z-[70] flex items-center justify-center bg-black/94"
      role="dialog"
      aria-modal="true"
      aria-label={isVideo ? "Full screen video" : "Full size photo"}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white"
        aria-label="Close full screen"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      {mediaItems.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white sm:inline-flex disabled:opacity-30"
            aria-label="Previous"
            disabled={index <= 0}
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white sm:inline-flex disabled:opacity-30"
            aria-label="Next"
            disabled={index >= mediaItems.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        </>
      ) : null}

      <div
        className="relative flex h-full w-full max-w-5xl items-center justify-center px-2 py-14"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={onTouchStartPinch}
        onTouchMove={onTouchMovePinch}
        onTouchEnd={onTouchEndPinch}
      >
        {isVideo ? (
          <video
            key={current.url}
            src={current.url}
            className="max-h-[88vh] max-w-full rounded-lg object-contain"
            controls
            playsInline
            autoPlay
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.alt || alt || "Photo"}
            className={cn(
              "max-h-[88vh] max-w-full touch-none select-none object-contain transition-transform duration-150"
            )}
            style={{ transform: `scale(${scale})` }}
            draggable={false}
          />
        )}

        {heartBurst ? (
          <span
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            aria-hidden
          >
            <Heart className="h-20 w-20 fill-white text-white drop-shadow-lg" />
          </span>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
        {mediaItems.length > 1 ? (
          <p className="text-xs font-medium text-white/80">
            {index + 1} / {mediaItems.length}
          </p>
        ) : null}
        <p className="text-[11px] text-white/55">
          {isVideo
            ? "Swipe down to close"
            : "Pinch to zoom · double-tap to appreciate · swipe to browse"}
        </p>
      </div>
    </div>,
    document.body
  );
});
