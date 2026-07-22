"use client";

import { Button } from "@/components/ui/Button";
import { GigaSocialPendingMediaPreview } from "@/components/gigasocial/GigaSocialPostMedia";
import {
  SOCIAL_AUDIO_ACCEPT,
  SOCIAL_CAPTION_MAX_LENGTH,
  SOCIAL_IMAGE_ACCEPT,
  SOCIAL_MAX_PHOTOS_PER_POST,
  SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC,
  SOCIAL_MAX_VIDEO_DURATION_SEC,
  SOCIAL_VIDEO_ACCEPT,
  type SocialPostMediaItemInput,
} from "@/lib/gigasocial/constants";
import type { CameraFilterId } from "@/lib/gigasocial/cameraFilters";
import { prepareAudioForPhotoPost } from "@/lib/gigasocial/audioProcessing";
import { extractHashtagsFromText, formatCompactHashtags } from "@/lib/gigasocial/hashtags";
import {
  classifyMediaFiles,
  UNIFIED_MEDIA_ACCEPT,
} from "@/lib/gigasocial/mediaComposer";
import { needsVideoTrim } from "@/lib/gigasocial/videoTrim";
import {
  getVideoDuration,
  generateVideoThumbnail,
  uploadSocialAudio,
  uploadSocialImages,
  uploadSocialVideo,
  type SocialMediaUploadDeps,
} from "@/lib/gigasocial/mediaUpload";
import type { GigaCreateActionId } from "@/components/gigasocial/create/gigaCreateMenu";
import { GigaSocialComposerMeta } from "@/components/gigasocial/composer/GigaSocialComposerMeta";
import { GigaSocialCreateMediaMenu, type CreateMediaAction } from "@/components/gigasocial/GigaSocialCreateMediaMenu";
import { CreatorTemplateQuickPick } from "@/components/gigasocial/feed/CreatorTemplateQuickPick";
import { GigaSocialAIAssistant } from "@/components/gigasocial/ai/GigaSocialAIAssistant";
import {
  GigaSocialCameraStudio,
  type GigaSocialCameraCapture,
} from "@/components/gigasocial/studio/GigaSocialCameraStudio";
import {
  GigaSocialMediaReview,
  type GigaSocialMediaReviewResult,
} from "@/components/gigasocial/studio/GigaSocialMediaReview";
import { GigaSocialMediaStudio } from "@/components/gigasocial/studio/GigaSocialMediaStudio";
import { GigaSocialVideoTrimEditor } from "@/components/gigasocial/studio/GigaSocialVideoTrimEditor";
import {
  appendRemixMarker,
  buildRemixBodyPrefix,
} from "@/lib/gigasocial/remixMeta";
import { POST_TYPE_OPTIONS, type SocialPostTypeId } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { api } from "convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { Camera, Loader2, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
}

interface PendingVideo {
  file: File;
  previewUrl: string;
  name: string;
  durationSec: number;
  thumbnailUrl?: string;
}

interface PendingAudio {
  file: File;
  name: string;
  durationSec: number;
}

interface VideoTrimDraft {
  file: File;
  previewUrl: string;
  durationSec: number;
}

interface GigaSocialComposerProps {
  communitySlug?: string;
  disabled?: boolean;
  sessionToken: string;
  initialAction?: GigaCreateActionId;
  initialBody?: string;
  initialPostType?: SocialPostTypeId;
  remixSource?: SocialPost;
  enableAIAssistant?: boolean;
  enableMediaStudio?: boolean;
  onPosted?: () => void;
  onFullscreenFlowChange?: (active: boolean) => void;
  onSubmit: (args: {
    body: string;
    postType: SocialPostTypeId;
    mediaItems?: SocialPostMediaItemInput[];
    communitySlug?: string;
    visibility?: "public" | "followers";
  }) => Promise<void>;
}

export const GigaSocialComposer = memo(function GigaSocialComposer({
  communitySlug,
  disabled,
  sessionToken,
  initialAction,
  initialBody,
  initialPostType,
  remixSource,
  enableAIAssistant = false,
  enableMediaStudio = false,
  onPosted,
  onFullscreenFlowChange,
  onSubmit,
}: GigaSocialComposerProps) {
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<SocialPostTypeId>("text");
  const [visibility, setVisibility] = useState<"public" | "followers">("public");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [videoTrimDraft, setVideoTrimDraft] = useState<VideoTrimDraft | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [previewFilterId, setPreviewFilterId] = useState<CameraFilterId>("none");
  const [locationTag, setLocationTag] = useState("");
  const [cameraStudioOpen, setCameraStudioOpen] = useState(
    () => initialAction === "media-camera" || initialAction === "story-content"
  );
  const [cameraDefaultMode, setCameraDefaultMode] = useState<"photo" | "video">(() =>
    initialAction === "story-content" ? "video" : "photo"
  );
  const [mediaReviewDraft, setMediaReviewDraft] = useState<{
    file: File;
    kind: "image" | "video";
    filterId?: CameraFilterId;
    durationSec?: number;
  } | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const unifiedMediaInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const fullscreenFlowActive = Boolean(
    mediaReviewDraft || videoTrimDraft || cameraStudioOpen
  );

  useEffect(() => {
    onFullscreenFlowChange?.(fullscreenFlowActive);
  }, [fullscreenFlowActive, onFullscreenFlowChange]);

  const prepareUpload = useAction(api.gigaSocialStorage.prepareMediaUpload);
  const resolveStorageUrl = useMutation(api.gigaSocialStorage.resolveStorageUrl);

  const uploadDeps = useMemo<SocialMediaUploadDeps>(
    () => ({
      prepareUpload,
      resolveStorageUrl,
      sessionToken,
    }),
    [prepareUpload, resolveStorageUrl, sessionToken]
  );

  const detectedHashtags = useMemo(() => extractHashtagsFromText(body), [body]);
  const detectedHashtagPreview = useMemo(
    () => formatCompactHashtags(detectedHashtags, 4),
    [detectedHashtags]
  );

  const studioPreviewUrl = pendingImages[0]?.previewUrl ?? null;

  useEffect(() => {
    if (!initialAction && !remixSource && !initialBody) return;
    if (remixSource) {
      const prefix = buildRemixBodyPrefix({
        sourcePostId: remixSource._id,
        sourceAuthorHandle: remixSource.author.handle,
        sourceAuthorName: remixSource.author.displayName,
      });
      setBody(`${prefix}My take: `);
      setPostType(remixSource.postType);
      return;
    }
    if (initialBody) setBody(initialBody);
    if (initialPostType) setPostType(initialPostType);
    if (!initialAction) {
      queueMicrotask(() => captionRef.current?.focus());
      return;
    }
    switch (initialAction) {
      case "video-studio":
      case "media-video":
        setPostType("video");
        queueMicrotask(() => videoInputRef.current?.click());
        break;
      case "photo-studio":
      case "media-photo":
        setPostType("image");
        queueMicrotask(() => imageInputRef.current?.click());
        setStudioOpen(true);
        break;
      case "media-unified":
        setPostType("image");
        queueMicrotask(() => unifiedMediaInputRef.current?.click());
        break;
      case "media-camera":
        setPostType("image");
        setCameraDefaultMode("photo");
        setCameraStudioOpen(true);
        break;
      case "story-content":
        setPostType("video");
        setBody((value) => value.trim() || initialBody || "✨ Story\n\n#story");
        setCameraDefaultMode("video");
        setCameraStudioOpen(true);
        break;
      case "media-audio":
        setPostType("image");
        queueMicrotask(() => audioInputRef.current?.click());
        break;
      case "text-post":
        setPostType("text");
        queueMicrotask(() => captionRef.current?.focus());
        break;
      case "learning-post":
        setPostType("education");
        setBody((value) => value.trim() || initialBody || "📚 What I learned today\n\n");
        queueMicrotask(() => captionRef.current?.focus());
        break;
      case "product-post":
        setPostType("creator");
        setBody((value) => value.trim() || initialBody || "🛒 Product showcase\n\n");
        queueMicrotask(() => captionRef.current?.focus());
        break;
      case "ai-enhance":
        setPostType("text");
        setBody((value) => value.trim() || initialBody || "Sharing an update with the Giga3 community…\n\n");
        queueMicrotask(() => captionRef.current?.focus());
        break;
      default:
        if (initialBody) queueMicrotask(() => captionRef.current?.focus());
        break;
    }
  }, [initialAction, initialBody, initialPostType, remixSource]);

  const hasMedia = pendingImages.length > 0 || Boolean(pendingVideo) || Boolean(pendingAudio);
  const canPost = Boolean(body.trim() || hasMedia);

  const revokePreview = useCallback((previewUrl: string) => {
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  }, []);

  const clearVideoTrimDraft = useCallback(() => {
    setVideoTrimDraft((current) => {
      if (current) revokePreview(current.previewUrl);
      return null;
    });
  }, [revokePreview]);

  const applyPendingVideo = useCallback(
    (args: {
      file: File;
      durationSec: number;
      thumbnailUrl?: string;
      trimmed?: boolean;
    }) => {
      setPendingVideo((current) => {
        if (current) revokePreview(current.previewUrl);
        return {
          file: args.file,
          previewUrl: URL.createObjectURL(args.file),
          name: args.file.name,
          durationSec: args.durationSec,
          thumbnailUrl: args.thumbnailUrl,
        };
      });
      setPostType("video");
      setError(null);
      if (args.trimmed) {
        setSuccess(`Video trimmed to ${SOCIAL_MAX_VIDEO_DURATION_SEC} seconds for GigaSocial.`);
      }
    },
    [revokePreview]
  );

  const clearPendingMedia = useCallback(() => {
    pendingImages.forEach((image) => revokePreview(image.previewUrl));
    if (pendingVideo) revokePreview(pendingVideo.previewUrl);
    clearVideoTrimDraft();
    setPendingImages([]);
    setPendingVideo(null);
    setPendingAudio(null);
    setPreviewFilterId("none");
  }, [clearVideoTrimDraft, pendingImages, pendingVideo, revokePreview]);

  const addImageFiles = useCallback(
    async (files: FileList | File[]) => {
      if (pendingVideo) {
        setError("Remove the video before adding photos.");
        return;
      }
      const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (!list.length) {
        setError("Choose JPG, PNG, or WEBP images.");
        return;
      }
      const remaining = SOCIAL_MAX_PHOTOS_PER_POST - pendingImages.length;
      if (remaining <= 0) {
        setError(`You can attach up to ${SOCIAL_MAX_PHOTOS_PER_POST} photos.`);
        return;
      }
      const next = list.slice(0, remaining).map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
      }));
      setPendingImages((prev) => [...prev, ...next]);
      setPostType("image");
      setError(null);
    },
    [pendingImages.length, pendingVideo]
  );

  const addVideoFile = useCallback(async (file: File) => {
    if (pendingImages.length || pendingAudio) {
      setError("Remove photos and music before adding a video.");
      return;
    }
    try {
      const durationSec = await getVideoDuration(file);
      if (needsVideoTrim(durationSec)) {
        clearVideoTrimDraft();
        setVideoTrimDraft({
          file,
          previewUrl: URL.createObjectURL(file),
          durationSec,
        });
        setPostType("video");
        setError(null);
        setSuccess(
          `This video is ${Math.ceil(durationSec)}s. Shorten it in Clip Studio (15 / 30 / 40s), then post.`
        );
        return;
      }
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        setError(
          "Could not read this video length. Try another file, or record in-app (max 40s)."
        );
        return;
      }
      const thumbnailUrl = await generateVideoThumbnail(file);
      applyPendingVideo({ file, durationSec, thumbnailUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read video.");
    }
  }, [applyPendingVideo, clearVideoTrimDraft, pendingAudio, pendingImages.length]);

  const handleCameraCapture = useCallback((capture: GigaSocialCameraCapture) => {
    setCameraStudioOpen(false);
    setMediaReviewDraft({
      file: capture.file,
      kind: capture.kind,
      filterId: capture.filterId,
      durationSec: capture.durationSec,
    });
  }, []);

  const handleMediaReviewComplete = useCallback(
    async (result: GigaSocialMediaReviewResult) => {
      if (result.filterId && result.filterId !== "none") {
        setPreviewFilterId(result.filterId);
      }
      if (result.caption.trim()) {
        setBody((current) => (current.trim() ? current : result.caption));
      }
      if (result.kind === "video") {
        const measured = await getVideoDuration(result.file);
        const durationSec =
          result.durationSec && result.durationSec > 0 ? result.durationSec : measured;
        if (needsVideoTrim(durationSec)) {
          clearVideoTrimDraft();
          setVideoTrimDraft({
            file: result.file,
            previewUrl: URL.createObjectURL(result.file),
            durationSec,
          });
          setPostType("video");
        } else {
          applyPendingVideo({
            file: result.file,
            durationSec,
            thumbnailUrl: result.thumbnailUrl,
          });
        }
      } else {
        await addImageFiles([result.file]);
      }
      setMediaReviewDraft(null);
    },
    [addImageFiles, applyPendingVideo, clearVideoTrimDraft]
  );

  const addAudioFile = useCallback(async (file: File) => {
    if (pendingVideo) {
      setError("Remove the video before adding music.");
      return;
    }
    if (!pendingImages.length) {
      setError("Add one or more photos first, then attach music.");
      return;
    }
    try {
      const prepared = await prepareAudioForPhotoPost(file, SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC);
      setPendingAudio({
        file: prepared.file,
        name: prepared.file.name,
        durationSec: prepared.durationSec,
      });
      setError(null);
      if (prepared.trimmed) {
        setSuccess(`Music trimmed to ${SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC} seconds for photo posts.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read audio.");
    }
  }, [pendingImages.length, pendingVideo]);

  const addDroppedFiles = useCallback(
    async (files: FileList | File[]) => {
      const selection = classifyMediaFiles(Array.from(files));
      if (selection.kind === "unsupported") {
        setError(selection.reason);
        return;
      }

      switch (selection.kind) {
        case "single-image":
        case "photo-gallery":
          await addImageFiles(selection.files);
          break;
        case "single-video":
          await addVideoFile(selection.files[0]);
          break;
        case "slideshow":
          await addImageFiles(selection.images);
          await addAudioFile(selection.audio);
          if (!body.trim()) {
            setBody("Photo slideshow with music 🎵\n\n");
          }
          setSuccess("Slideshow video will play with cinematic transitions and your music track.");
          break;
        case "video-with-audio":
          await addVideoFile(selection.video);
          if (selection.audio) {
            setSuccess("Video selected. Soundtrack mixing is applied on publish.");
          }
          break;
        case "mixed-timeline":
          setError(
            "Combined photo + video timelines are best created one at a time. Add photos or a video separately."
          );
          break;
        default:
          break;
      }
    },
    [addAudioFile, addImageFiles, addVideoFile, body]
  );

  const handleUnifiedMediaPick = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      await addDroppedFiles(files);
    },
    [addDroppedFiles]
  );

  const handleCreateAction = useCallback(
    (action: CreateMediaAction) => {
      switch (action) {
        case "media":
          unifiedMediaInputRef.current?.click();
          break;
        case "photo":
          setCameraDefaultMode("photo");
          setCameraStudioOpen(true);
          break;
        case "photos":
          imageInputRef.current?.click();
          break;
        case "video":
          videoInputRef.current?.click();
          break;
        case "music":
          audioInputRef.current?.click();
          break;
        case "templates":
          router.push("/creator-studio?tab=image");
          break;
        default:
          break;
      }
    },
    [router]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      if (disabled || busy) return;
      if (!event.dataTransfer.files?.length) return;
      void addDroppedFiles(event.dataTransfer.files);
    },
    [addDroppedFiles, busy, disabled]
  );

  function handleCancelUpload() {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setBusy(false);
    setUploadPercent(null);
    setError("Upload cancelled.");
  }

  async function handleSubmit() {
    if (busy || disabled || !canPost) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    setUploadPercent(0);
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      let mediaItems: SocialPostMediaItemInput[] | undefined;
      if (pendingVideo) {
        const uploaded = await uploadSocialVideo(uploadDeps, pendingVideo.file, {
          signal: controller.signal,
          onProgress: (progress) => setUploadPercent(progress.percent),
        });
        mediaItems = [uploaded];
      } else if (pendingImages.length) {
        const uploadedImages = await uploadSocialImages(
          uploadDeps,
          pendingImages.map((image) => image.file),
          {
            filterId: previewFilterId === "none" ? undefined : previewFilterId,
            signal: controller.signal,
            onProgress: (_index, progress) => setUploadPercent(progress.percent),
          }
        );
        mediaItems = [...uploadedImages];
        if (pendingAudio) {
          const uploadedAudio = await uploadSocialAudio(uploadDeps, pendingAudio.file, {
            signal: controller.signal,
            maxDurationSec: SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC,
            onProgress: (progress) => setUploadPercent(progress.percent),
          });
          mediaItems.push(uploadedAudio);
        }
      }

      let finalBody = body.trim();
      if (locationTag.trim()) {
        finalBody = `${finalBody}\n📍 ${locationTag.trim()}`.trim();
      }
      if (remixSource) {
        finalBody = appendRemixMarker(finalBody, remixSource._id);
      }

      await onSubmit({
        body: finalBody,
        postType,
        mediaItems,
        communitySlug,
        visibility,
      });

      setBody("");
      clearPendingMedia();
      setPostType("text");
      setSuccess("Post published successfully.");
      onPosted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create post.");
    } finally {
      uploadAbortRef.current = null;
      setBusy(false);
      setUploadPercent(null);
    }
  }

  if (mediaReviewDraft) {
    return (
      <GigaSocialMediaReview
        open
        file={mediaReviewDraft.file}
        kind={mediaReviewDraft.kind}
        filterId={mediaReviewDraft.filterId}
        durationSec={mediaReviewDraft.durationSec}
        postType={postType}
        enableAI={enableAIAssistant}
        onClose={() => setMediaReviewDraft(null)}
        onSkip={(result) => void handleMediaReviewComplete(result)}
      />
    );
  }

  if (videoTrimDraft) {
    return (
      <GigaSocialVideoTrimEditor
        file={videoTrimDraft.file}
        previewUrl={videoTrimDraft.previewUrl}
        durationSec={videoTrimDraft.durationSec}
        onCancel={clearVideoTrimDraft}
        onComplete={(result) => {
          clearVideoTrimDraft();
          applyPendingVideo(result);
        }}
      />
    );
  }

  return (
    <>
    <div
      id="gigasocial-composer"
      className="saas-card rounded-2xl border border-border p-4"
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled && !busy) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <label htmlFor="gigasocial-caption" className="sr-only">
        Post caption
      </label>
      <GigaSocialComposerMeta
        location={locationTag}
        onLocationChange={setLocationTag}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        onInsertMention={() => {
          setBody((value) => `${value.trimEnd()}@`.trimStart());
          captionRef.current?.focus();
        }}
        onInsertEmoji={(emoji) => setBody((value) => `${value}${emoji}`)}
        disabled={disabled || busy}
      />
      <textarea
        id="gigasocial-caption"
        ref={captionRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={SOCIAL_CAPTION_MAX_LENGTH}
        placeholder="Share something with the Giga3 community… Use #hashtags and emojis."
        className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
        disabled={disabled || busy}
      />
      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span>
          {body.length}/{SOCIAL_CAPTION_MAX_LENGTH}
        </span>
        {detectedHashtagPreview ? (
          <span className="max-w-[58%] truncate text-[11px] text-muted" aria-label="Detected hashtags">
            {detectedHashtagPreview}
          </span>
        ) : null}
      </div>

      {enableAIAssistant ? (
        <div className="mt-3">
          <GigaSocialAIAssistant
            body={body}
            postType={postType}
            onApplyCaption={setBody}
            onApplyHashtags={(tags) => {
              const suffix = tags
                .slice(0, 5)
                .map((tag) => `#${tag}`)
                .join(" ");
              setBody((value) => `${value.trim()} ${suffix}`.trim());
            }}
            onApplyCategory={setPostType}
          />
        </div>
      ) : null}

      <GigaSocialPendingMediaPreview
        images={pendingImages}
        video={pendingVideo ?? undefined}
        audio={pendingAudio ?? undefined}
        imageFilterId={previewFilterId}
        onRemoveImage={(id) => {
          setPendingImages((prev) => {
            const target = prev.find((image) => image.id === id);
            if (target) revokePreview(target.previewUrl);
            const next = prev.filter((image) => image.id !== id);
            if (next.length === 0) setPendingAudio(null);
            return next;
          });
        }}
        onRemoveVideo={() => {
          if (pendingVideo) revokePreview(pendingVideo.previewUrl);
          setPendingVideo(null);
        }}
        onRemoveAudio={() => setPendingAudio(null)}
      />

      <CreatorTemplateQuickPick className="mt-3" />

      {enableMediaStudio && studioOpen && studioPreviewUrl ? (
        <div className="mt-3">
          <GigaSocialMediaStudio
            previewUrl={studioPreviewUrl}
            onClose={() => setStudioOpen(false)}
            onApplyFilter={(filterId) => setPreviewFilterId(filterId)}
          />
        </div>
      ) : null}

      {dragActive ? (
        <p className="mt-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-xs text-accent">
          Drop one or more photos (optional music), or a short video
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          Add photos, music (up to {SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC}s), or video. Long videos
          open the trim editor (max {SOCIAL_MAX_VIDEO_DURATION_SEC}s).
        </p>
      )}

      {uploadPercent !== null && busy ? (
        <div className="mt-3 space-y-2" role="status" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-muted/20">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>Uploading… {uploadPercent}%</span>
            <button
              type="button"
              onClick={handleCancelUpload}
              className="inline-flex items-center gap-1 text-red-700"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={unifiedMediaInputRef}
          type="file"
          accept={UNIFIED_MEDIA_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            void handleUnifiedMediaPick(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept={SOCIAL_IMAGE_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void addImageFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept={SOCIAL_VIDEO_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void addVideoFile(file);
            event.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              event.target.value = "";
              return;
            }
            if (file.type.startsWith("video/")) {
              void addVideoFile(file);
            } else if (event.target.files) {
              void addImageFiles(event.target.files);
            }
            event.target.value = "";
          }}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept={SOCIAL_AUDIO_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void addAudioFile(file);
            event.target.value = "";
          }}
        />

        <GigaSocialCreateMediaMenu
          disabled={disabled}
          busy={busy}
          canAddMusic={pendingImages.length > 0 && !pendingVideo}
          onAction={handleCreateAction}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || busy || Boolean(pendingVideo)}
          onClick={() => {
            setCameraDefaultMode("photo");
            setCameraStudioOpen(true);
          }}
          aria-label="Capture photo with camera"
          className="hidden sm:inline-flex"
        >
          <Camera className="h-4 w-4" aria-hidden />
          Camera
        </Button>

        <select
          value={postType}
          onChange={(e) => setPostType(e.target.value as SocialPostTypeId)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
          disabled={disabled || busy}
          aria-label="Post type"
        >
          {POST_TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        <Button
          type="button"
          disabled={disabled || busy || !canPost}
          onClick={() => void handleSubmit()}
          className="ml-auto min-h-10"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post
        </Button>
      </div>

      {success ? (
        <p className="mt-2 text-xs text-green-700" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
    <GigaSocialCameraStudio
      open={cameraStudioOpen}
      defaultMode={cameraDefaultMode}
      onClose={() => setCameraStudioOpen(false)}
      onCapture={handleCameraCapture}
    />
    </>
  );
});
