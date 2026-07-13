"use client";

import { Button } from "@/components/ui/Button";
import { GigaSocialPendingMediaPreview } from "@/components/gigasocial/GigaSocialPostMedia";
import {
  SOCIAL_AUDIO_ACCEPT,
  SOCIAL_CAPTION_MAX_LENGTH,
  SOCIAL_IMAGE_ACCEPT,
  SOCIAL_MAX_PHOTOS_PER_POST,
  SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC,
  SOCIAL_VIDEO_ACCEPT,
  type SocialPostMediaItemInput,
} from "@/lib/gigasocial/constants";
import type { CameraFilterId } from "@/lib/gigasocial/cameraFilters";
import { prepareAudioForPhotoPost } from "@/lib/gigasocial/audioProcessing";
import { extractHashtagsFromText, formatCompactHashtags } from "@/lib/gigasocial/hashtags";
import {
  getVideoDuration,
  generateVideoThumbnail,
  uploadSocialAudio,
  uploadSocialImages,
  uploadSocialVideo,
  type SocialMediaUploadDeps,
} from "@/lib/gigasocial/mediaUpload";
import type { GigaCreateActionId } from "@/components/gigasocial/create/gigaCreateMenu";
import { GigaSocialCreateMediaMenu, type CreateMediaAction } from "@/components/gigasocial/GigaSocialCreateMediaMenu";
import { GigaSocialAIAssistant } from "@/components/gigasocial/ai/GigaSocialAIAssistant";
import { GigaSocialMediaStudio } from "@/components/gigasocial/studio/GigaSocialMediaStudio";
import {
  appendRemixMarker,
  buildRemixBodyPrefix,
} from "@/lib/gigasocial/remixMeta";
import { POST_TYPE_OPTIONS, type SocialPostTypeId } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { api } from "convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { classifyMediaFiles, UNIFIED_MEDIA_ACCEPT } from "@/lib/gigasocial/mediaComposer";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Send, X } from "lucide-react";
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

interface GigaSocialComposerProps {
  communitySlug?: string;
  disabled?: boolean;
  sessionToken: string;
  initialAction?: GigaCreateActionId;
  remixSource?: SocialPost;
  enableAIAssistant?: boolean;
  enableMediaStudio?: boolean;
  onPosted?: () => void;
  onSubmit: (args: {
    body: string;
    postType: SocialPostTypeId;
    mediaItems?: SocialPostMediaItemInput[];
    communitySlug?: string;
  }) => Promise<void>;
}

export const GigaSocialComposer = memo(function GigaSocialComposer({
  communitySlug,
  disabled,
  sessionToken,
  initialAction,
  remixSource,
  enableAIAssistant = false,
  enableMediaStudio = false,
  onPosted,
  onSubmit,
}: GigaSocialComposerProps) {
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<SocialPostTypeId>("text");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [previewFilterId, setPreviewFilterId] = useState<CameraFilterId>("none");
  const uploadAbortRef = useRef<AbortController | null>(null);
  const unifiedMediaInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

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
    if (!initialAction && !remixSource) return;
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
    switch (initialAction) {
      case "video-studio":
        setPostType("video");
        queueMicrotask(() => videoInputRef.current?.click());
        break;
      case "photo-studio":
        setPostType("image");
        queueMicrotask(() => imageInputRef.current?.click());
        setStudioOpen(true);
        break;
      case "text-post":
        setPostType("text");
        queueMicrotask(() => captionRef.current?.focus());
        break;
      case "learning-post":
        setPostType("education");
        setBody((value) => value.trim() || "📚 What I learned today\n\n");
        queueMicrotask(() => captionRef.current?.focus());
        break;
      case "product-post":
        setPostType("creator");
        setBody((value) => value.trim() || "🛒 Product showcase\n\n");
        queueMicrotask(() => captionRef.current?.focus());
        break;
      case "ai-enhance":
        setPostType("text");
        setBody((value) => value.trim() || "Sharing an update with the Giga3 community…\n\n");
        queueMicrotask(() => captionRef.current?.focus());
        break;
      default:
        break;
    }
  }, [initialAction, remixSource]);

  const hasMedia = pendingImages.length > 0 || Boolean(pendingVideo) || Boolean(pendingAudio);
  const canPost = Boolean(body.trim() || hasMedia);

  const revokePreview = useCallback((previewUrl: string) => {
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  }, []);

  const clearPendingMedia = useCallback(() => {
    pendingImages.forEach((image) => revokePreview(image.previewUrl));
    if (pendingVideo) revokePreview(pendingVideo.previewUrl);
    setPendingImages([]);
    setPendingVideo(null);
    setPendingAudio(null);
    setPreviewFilterId("none");
  }, [pendingImages, pendingVideo, revokePreview]);

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
      if (durationSec > 40) {
        setError(
          `Videos must be 40 seconds or shorter. This video is ${Math.ceil(durationSec)} seconds.`
        );
        return;
      }
      const thumbnailUrl = await generateVideoThumbnail(file);
      setPendingVideo({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        durationSec,
        thumbnailUrl,
      });
      setPostType("video");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read video.");
    }
  }, [pendingAudio, pendingImages.length]);

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
        case "photo":
          cameraInputRef.current?.click();
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
      if (remixSource) {
        finalBody = appendRemixMarker(finalBody, remixSource._id);
      }

      await onSubmit({
        body: finalBody,
        postType,
        mediaItems,
        communitySlug,
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

  return (
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
          Add multiple photos, then attach music (up to {SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC}s). Videos up to 40s.
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
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void addImageFiles(event.target.files);
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
          onClick={() => cameraInputRef.current?.click()}
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
  );
});
