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
import { Check, Replace, RotateCcw, SkipForward, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  const previewUrl = useMemo(() => URL.createObjectURL(workingFile), [workingFile]);
  const previewFilter = getCameraFilterCss(activeFilterId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setWorkingFile(file);
    setWorkingDuration(durationSec);
    setActiveFilterId(filterId);
    setFinishing(false);
  }, [durationSec, file, filterId]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Android system back closes review; parent composer caption is preserved.
  useEffect(() => {
    if (!open) return;
    let ignorePop = false;
    const onPopState = () => {
      if (ignorePop) return;
      if (finishing) {
        // Keep the review entry active while the parent consumes the selected file.
        window.history.pushState({ gigasocialMediaReview: true }, "");
        return;
      }
      onClose();
    };
    window.history.pushState({ gigasocialMediaReview: true }, "");
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (window.history.state?.gigasocialMediaReview) {
        ignorePop = true;
        window.history.back();
      }
    };
  }, [finishing, onClose, open]);

  const finish = useCallback(
    async (skipCaption = false) => {
      if (finishing) return;
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
        });
      } finally {
        setFinishing(false);
      }
    },
    [activeFilterId, caption, finishing, kind, onSkip, workingDuration, workingFile]
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
          <video
            src={previewUrl}
            controls
            playsInline
            muted={false}
            preload="metadata"
            className="absolute inset-0 h-full w-full object-contain bg-black"
          />
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
          <button type="button" onClick={onClose} disabled={finishing} className="text-sm text-white/90 disabled:opacity-50">
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
            disabled={finishing}
            className="inline-flex items-center gap-1 text-sm text-white disabled:opacity-60"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </button>
        </div>
      </div>

      <div className="max-h-[42vh] space-y-3 overflow-y-auto border-t border-white/10 bg-black/90 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap gap-2">
          {kind === "image" ? (
            <Button type="button" size="sm" variant="outline" disabled={finishing} onClick={() => setStudioOpen((v) => !v)}>
              <RotateCcw className="h-4 w-4" />
              Filters
            </Button>
          ) : null}
          {kind === "video" && workingDuration && needsVideoTrim(workingDuration) ? (
            <Button type="button" size="sm" variant="outline" disabled={finishing} onClick={() => setTrimOpen(true)}>
              Trim
            </Button>
          ) : null}
          {onReplace ? (
            <Button type="button" size="sm" variant="outline" disabled={finishing} onClick={onReplace}>
              <Replace className="h-4 w-4" />
              Replace
            </Button>
          ) : null}
          {onRemove ? (
            <Button type="button" size="sm" variant="outline" disabled={finishing} onClick={onRemove}>
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
          disabled={finishing}
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
