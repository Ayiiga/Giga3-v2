"use client";

import { Button } from "@/components/ui/Button";
import { GigaSocialAIAssistant } from "@/components/gigasocial/ai/GigaSocialAIAssistant";
import { GigaSocialMediaStudio } from "@/components/gigasocial/studio/GigaSocialMediaStudio";
import { GigaSocialVideoTrimEditor } from "@/components/gigasocial/studio/GigaSocialVideoTrimEditor";
import { getCameraFilterCss } from "@/lib/gigasocial/cameraFilters";
import type { CameraFilterId } from "@/lib/gigasocial/cameraFilters";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";
import { needsVideoTrim } from "@/lib/gigasocial/videoTrim";
import { cn } from "@/lib/utils";
import { Check, Replace, RotateCcw, SkipForward, Trash2, Play, Video } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type GigaSocialMediaReviewResult = {
  file: File;
  kind: "image" | "video";
  caption: string;
  filterId?: CameraFilterId;
  thumbnailUrl?: string;
  durationSec?: number;
};

type GigaSocialMediaReviewProps = {
  open: boolean;
  file: File;
  kind: "image" | "video";
  filterId?: CameraFilterId;
  durationSec?: number;
  probeBusy?: boolean;
  postType: SocialPostTypeId;
  enableAI?: boolean;
  onSkip: (result: GigaSocialMediaReviewResult) => Promise<void> | void;
  onClose: () => void;
  /** Replace selected media (re-open picker). */
  onReplace?: () => void;
  /** Remove selection and return to composer without applying. */
  onRemove?: () => void;
};

export const GigaSocialMediaReview = memo(function GigaSocialMediaReview({
  open,
  file,
  kind,
  filterId = "none",
  durationSec,
  probeBusy = false,
  postType,
  enableAI = false,
  onSkip,
  onClose,
  onReplace,
  onRemove,
}: GigaSocialMediaReviewProps) {
  const [mounted, setMounted] = useState(false);
  const [caption, setCaption] = useState("");
  const [activeFilterId, setActiveFilterId] = useState<CameraFilterId>(filterId);
  const [studioOpen, setStudioOpen] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const [workingFile, setWorkingFile] = useState(file);
  const [workingDuration, setWorkingDuration] = useState(durationSec);
  const [finishing, setFinishing] = useState(false);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [thumbnail, setThumbnail] = useState<string>();
  const videoElement = useRef<HTMLVideoElement | null>(null);
  const releasePlayback = useCallback(() => {
    const video = videoElement.current;
    if (video) { video.pause(); video.removeAttribute("src"); try { video.load(); } catch { /* decoder already released */ } }
  }, []);
  const bindVideo = useCallback((node: HTMLVideoElement | null) => {
    if (videoElement.current && videoElement.current !== node) releasePlayback();
    videoElement.current = node;
  }, [releasePlayback]);
  function closePlayback() { releasePlayback(); setPlaybackOpen(false); }
  function rememberFrame(video: HTMLVideoElement) {
    if (!video.videoWidth || !video.videoHeight) return;
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d"); if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnail(canvas.toDataURL("image/jpeg", 0.7));
    } catch { /* thumbnail is optional */ }
  }
  const finishingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const previewUrl = useMemo(() => URL.createObjectURL(workingFile), [workingFile]);
  const previewFilter = getCameraFilterCss(activeFilterId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    releasePlayback(); setPlaybackOpen(false); setThumbnail(undefined); setPreviewError("");
    setWorkingFile(file);
    setActiveFilterId(filterId);
    finishingRef.current = false;
    setFinishing(false);
  }, [file, filterId, releasePlayback]);
  useEffect(() => { setWorkingDuration(durationSec); }, [durationSec]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Keep one history marker for the lifetime of this review. Read callbacks
  // through refs so parent renders cannot tear down and recreate the marker.
  useEffect(() => {
    if (!open) return;
    const onPopState = () => {
      if (finishingRef.current) {
        window.history.pushState({ gigasocialMediaReview: true }, "");
        return;
      }
      onCloseRef.current();
    };
    window.history.pushState({ gigasocialMediaReview: true }, "");
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (window.history.state?.gigasocialMediaReview) window.history.back();
    };
  }, [open]);

  const finish = useCallback(
    async (skipCaption = false) => {
      if (finishingRef.current || probeBusy) return;
      releasePlayback(); setPlaybackOpen(false);
      finishingRef.current = true;
      setFinishing(true);
      try {
        // Hand the original File to the composer immediately. Thumbnail decoding
        // is intentionally not a prerequisite: Android gallery codecs and
        // data-saving browsers can stall or reject local video frame extraction.
        // The upload pipeline generates its own optional thumbnail in parallel.
        await onSkip({
          file: workingFile,
          kind,
          caption: skipCaption ? "" : caption,
          filterId: activeFilterId,
          durationSec: workingDuration,
          thumbnailUrl: thumbnail,
        });
      } finally {
        finishingRef.current = false;
        setFinishing(false);
      }
    },
    [activeFilterId, caption, kind, onSkip, workingDuration, workingFile, probeBusy, releasePlayback, thumbnail]
  );

  if (!mounted || !open) return null;

  if (trimOpen && workingDuration && needsVideoTrim(workingDuration)) {
    return (
      <GigaSocialVideoTrimEditor
        file={workingFile}
        previewUrl={previewUrl}
        durationSec={workingDuration}
        className="fixed inset-x-3 bottom-3 z-[72] max-w-lg mx-auto"
        onCancel={() => setTrimOpen(false)}
        onComplete={(result) => {
          setThumbnail(undefined); setPlaybackOpen(false);
          setWorkingFile(result.file);
          setWorkingDuration(result.durationSec);
          setTrimOpen(false);
        }}
      />
    );
  }

  const durationLabel =
    kind === "video" && workingDuration && workingDuration > 0
      ? `${Math.round(workingDuration)}s`
      : null;

  return createPortal(
    <div className="gigasocial-stable gigasocial-media-review gigasocial-immersive-capture fixed inset-0 z-[71] flex flex-col bg-black">
      <div className="relative min-h-0 flex-1">
        {kind === "video" ? (
          playbackOpen && !finishing && !probeBusy ? (
            <video ref={bindVideo} src={previewUrl} controls playsInline preload="metadata"
              className="absolute inset-0 h-full w-full object-contain bg-black"
              onLoadedData={event => rememberFrame(event.currentTarget)}
              onLoadedMetadata={event => { const duration = event.currentTarget.duration; if (Number.isFinite(duration) && duration > 0) setWorkingDuration(duration); }}
              onError={() => { closePlayback(); setPreviewError("Preview could not play. You can replace the file or continue after its duration is verified."); }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center text-white">
              {thumbnail ? <img src={thumbnail} alt="Selected video frame" className="max-h-[55%] max-w-full rounded-xl object-contain" /> : <Video className="h-12 w-12 text-violet-300" aria-hidden />}
              <p className="max-w-full truncate text-sm font-semibold">{workingFile.name}</p>
              <button type="button" disabled={probeBusy || finishing} onClick={() => { setPreviewError(""); setPlaybackOpen(true); }} className="review-action inline-flex items-center gap-2 rounded-xl px-4 py-2"><Play className="h-4 w-4" />{probeBusy ? "Checking video…" : "Play preview"}</button>
              <p className="text-xs text-white/70">{previewError || "Playback opens only when requested to keep Android stable."}</p>
            </div>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain bg-black"
            style={{ filter: previewFilter !== "none" ? previewFilter : undefined }}
          />
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
          <button type="button" onClick={() => { closePlayback(); onClose(); }} disabled={finishing} className="text-sm text-white/90 disabled:opacity-50">
            Back
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold">Review</p>
            {durationLabel ? (
              <p className="text-[11px] text-white/70">Duration {durationLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void finish(true)}
            disabled={finishing || probeBusy}
            className="inline-flex items-center gap-1 text-sm text-white disabled:opacity-60"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </button>
        </div>
      </div>

      <div className="max-h-[42vh] space-y-3 overflow-y-auto border-t border-white/10 bg-black/90 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap gap-2">
          {playbackOpen && <Button type="button" size="sm" className="review-action" onClick={closePlayback}>Close playback</Button>}
          {kind === "image" ? (
            <Button type="button" size="sm" variant="outline" disabled={finishing} onClick={() => setStudioOpen((v) => !v)}>
              <RotateCcw className="h-4 w-4" />
              Filters
            </Button>
          ) : null}
          {kind === "video" && workingDuration && needsVideoTrim(workingDuration) ? (
            <Button type="button" size="sm" variant="outline" className="review-action" disabled={finishing || probeBusy} onClick={() => { closePlayback(); setTrimOpen(true); }}>
              Trim
            </Button>
          ) : null}
          {onReplace ? (
            <Button type="button" size="sm" variant="outline" className="review-action" disabled={finishing} onClick={() => { closePlayback(); onReplace(); }}>
              <Replace className="h-4 w-4" />
              Replace
            </Button>
          ) : null}
          {onRemove ? (
            <Button type="button" size="sm" variant="outline" className="review-action" disabled={finishing} onClick={() => { closePlayback(); onRemove(); }}>
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>

        {studioOpen && kind === "image" ? (
          <GigaSocialMediaStudio
            previewUrl={previewUrl}
            onClose={() => setStudioOpen(false)}
            onApplyFilter={setActiveFilterId}
          />
        ) : null}

        <label className="block text-xs text-white/70">
          Caption
          <textarea
            disabled={finishing}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={2}
            placeholder="Add a caption, #hashtags, @mentions…"
            className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
          />
        </label>

        {enableAI ? (
          <GigaSocialAIAssistant
            body={caption}
            postType={postType}
            onApplyCaption={setCaption}
            onApplyHashtags={(tags) => {
              const suffix = tags.map((tag) => `#${tag}`).join(" ");
              setCaption((value) => `${value.trim()} ${suffix}`.trim());
            }}
            onApplyCategory={() => undefined}
          />
        ) : null}

        <Button
          type="button"
          className={cn("min-h-11 w-full")}
          disabled={finishing || probeBusy}
          onClick={() => void finish(false)}
        >
          <Check className="h-4 w-4" />
          {finishing ? "Preparing…" : "Continue to post"}
        </Button>
      </div>
    </div>,
    document.body
  );
});
