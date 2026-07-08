"use client";

import { Button } from "@/components/ui/Button";
import { GigaSocialPendingMediaPreview } from "@/components/gigasocial/GigaSocialPostMedia";
import {
  SOCIAL_CAPTION_MAX_LENGTH,
  SOCIAL_IMAGE_ACCEPT,
  SOCIAL_MAX_PHOTOS_PER_POST,
  SOCIAL_VIDEO_ACCEPT,
  type SocialPostMediaItemInput,
} from "@/lib/gigasocial/constants";
import { extractHashtagsFromText } from "@/lib/gigasocial/hashtags";
import {
  getVideoDuration,
  generateVideoThumbnail,
  uploadSocialImages,
  uploadSocialVideo,
  type SocialMediaUploadDeps,
} from "@/lib/gigasocial/mediaUpload";
import { POST_TYPE_OPTIONS, type SocialPostTypeId } from "@/lib/gigasocial/sections";
import { api } from "convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { Camera, ImagePlus, Loader2, Send, Video, X } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";

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

interface GigaSocialComposerProps {
  communitySlug?: string;
  disabled?: boolean;
  sessionToken: string;
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
  onSubmit,
}: GigaSocialComposerProps) {
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<SocialPostTypeId>("text");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const hasMedia = pendingImages.length > 0 || Boolean(pendingVideo);
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
    if (pendingImages.length) {
      setError("Remove photos before adding a video.");
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
  }, [pendingImages.length]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      if (disabled || busy) return;
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      if (file.type.startsWith("video/")) {
        void addVideoFile(file);
        return;
      }
      if (file.type.startsWith("image/")) {
        void addImageFiles(event.dataTransfer.files);
      }
    },
    [addImageFiles, addVideoFile, busy, disabled]
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
        mediaItems = await uploadSocialImages(
          uploadDeps,
          pendingImages.map((image) => image.file),
          {
            signal: controller.signal,
            onProgress: (_index, progress) => setUploadPercent(progress.percent),
          }
        );
      }

      await onSubmit({
        body,
        postType,
        mediaItems,
        communitySlug,
      });

      setBody("");
      clearPendingMedia();
      setPostType("text");
      setSuccess("Post published successfully.");
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
        {detectedHashtags.length > 0 ? (
          <span aria-label="Detected hashtags">
            {detectedHashtags.map((tag) => `#${tag}`).join(" ")}
          </span>
        ) : null}
      </div>

      <GigaSocialPendingMediaPreview
        images={pendingImages}
        video={pendingVideo ?? undefined}
        onRemoveImage={(id) => {
          setPendingImages((prev) => {
            const target = prev.find((image) => image.id === id);
            if (target) revokePreview(target.previewUrl);
            return prev.filter((image) => image.id !== id);
          });
        }}
        onRemoveVideo={() => {
          if (pendingVideo) revokePreview(pendingVideo.previewUrl);
          setPendingVideo(null);
        }}
      />

      {dragActive ? (
        <p className="mt-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-xs text-accent">
          Drop photos or a short video here
        </p>
      ) : null}

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

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || busy || Boolean(pendingVideo)}
          onClick={() => imageInputRef.current?.click()}
          aria-label="Add photos"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          Photos
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || busy || pendingImages.length > 0}
          onClick={() => videoInputRef.current?.click()}
          aria-label="Add video"
        >
          <Video className="h-4 w-4" aria-hidden />
          Video
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || busy || Boolean(pendingVideo)}
          onClick={() => cameraInputRef.current?.click()}
          aria-label="Capture photo"
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
