"use client";

import { Button } from "@/components/ui/Button";
import { GigaSocialAIAssistant } from "@/components/gigasocial/ai/GigaSocialAIAssistant";
import { GigaSocialMediaStudio } from "@/components/gigasocial/studio/GigaSocialMediaStudio";
import { GigaSocialVideoTrimEditor } from "@/components/gigasocial/studio/GigaSocialVideoTrimEditor";
import type { CameraFilterId } from "@/lib/gigasocial/cameraFilters";
import { generateVideoThumbnail } from "@/lib/gigasocial/mediaUpload";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";
import { needsVideoTrim } from "@/lib/gigasocial/videoTrim";
import { cn } from "@/lib/utils";
import { Check, RotateCcw, SkipForward } from "lucide-react";
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
  onSkip: (result: GigaSocialMediaReviewResult) => void;
  onClose: () => void;
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
}: GigaSocialMediaReviewProps) {
  const [mounted, setMounted] = useState(false);
  const [caption, setCaption] = useState("");
  const [activeFilterId, setActiveFilterId] = useState<CameraFilterId>(filterId);
  const [studioOpen, setStudioOpen] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const [workingFile, setWorkingFile] = useState(file);
  const [workingDuration, setWorkingDuration] = useState(durationSec);
  const previewUrl = useMemo(() => URL.createObjectURL(workingFile), [workingFile]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setWorkingFile(file);
    setWorkingDuration(durationSec);
    setActiveFilterId(filterId);
  }, [durationSec, file, filterId]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const finish = useCallback(
    async (skipCaption = false) => {
      let thumbnailUrl: string | undefined;
      if (workingFile.type.startsWith("video/")) {
        thumbnailUrl = await generateVideoThumbnail(workingFile);
      }
      onSkip({
        file: workingFile,
        kind,
        caption: skipCaption ? "" : caption,
        filterId: activeFilterId,
        thumbnailUrl,
        durationSec: workingDuration,
      });
    },
    [activeFilterId, caption, kind, onSkip, workingDuration, workingFile]
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

  return createPortal(
    <div className="gigasocial-stable gigasocial-media-review fixed inset-0 z-[71] flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <button type="button" onClick={onClose} className="text-sm text-white/80">
          Cancel
        </button>
        <p className="text-sm font-semibold">Review</p>
        <button
          type="button"
          onClick={() => void finish(true)}
          className="inline-flex items-center gap-1 text-sm text-violet-200"
        >
          <SkipForward className="h-4 w-4" />
          Skip
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black">
          {kind === "video" ? (
            <video src={previewUrl} controls playsInline className="max-h-[50vh] w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="max-h-[50vh] w-full object-contain" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {kind === "image" ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setStudioOpen((v) => !v)}>
              <RotateCcw className="h-4 w-4" />
              Filters
            </Button>
          ) : null}
          {kind === "video" && workingDuration && needsVideoTrim(workingDuration) ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setTrimOpen(true)}>
              Trim
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
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={3}
            placeholder="Add a caption, #hashtags, @mentions…"
            className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
          />
        </label>

        {enableAI && caption.trim() ? (
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
          onClick={() => void finish(false)}
        >
          <Check className="h-4 w-4" />
          Use in post
        </Button>
      </div>
    </div>,
    document.body
  );
});
