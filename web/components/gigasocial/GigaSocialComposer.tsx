"use client";

import { Button } from "@/components/ui/Button";
import { GigaSocialPendingMediaPreview } from "@/components/gigasocial/GigaSocialPostMedia";
import {
  SOCIAL_AUDIO_ACCEPT,
  socialCaptionMaxLength,
  SOCIAL_IMAGE_ACCEPT,
  SOCIAL_MAX_PHOTOS_PER_POST,
  SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC,
  SOCIAL_MAX_VIDEO_DURATION_MIN,
  SOCIAL_MAX_VIDEO_MB,
  SOCIAL_VIDEO_ACCEPT,
  isLikelySocialVideoFile,
  resolveImageContentType,
  resolveVideoContentType,
  type SocialPostMediaItemInput,
} from "@/lib/gigasocial/constants";
import { isUsableVideoDuration } from "@/lib/gigasocial/videoDuration";
import type { CameraFilterId } from "@/lib/gigasocial/cameraFilters";
import { prepareAudioForPhotoPost } from "@/lib/gigasocial/audioProcessing";
import { getCameraFilterCss } from "@/lib/gigasocial/cameraFilters";
import { brightenSocialPhoto } from "@/lib/gigasocial/photoEnhancement";
import { extractHashtagsFromText, formatCompactHashtags } from "@/lib/gigasocial/hashtags";
import {
  classifyMediaFiles,
  UNIFIED_MEDIA_ACCEPT,
} from "@/lib/gigasocial/mediaComposer";
import {
  resolveInitialMediaPickerIntent,
  type InitialMediaPickerTarget,
} from "@/lib/gigasocial/initialMediaPicker";
import { composePhotoMusicVideo } from "@/lib/gigasocial/photoMusicVideo";
import { needsVideoTrim, VIDEO_CLIP_LENGTH_OPTIONS_SEC } from "@/lib/gigasocial/videoTrim";
import {
  canOptionalEpisodeSplit,
  SOCIAL_EPISODE_SPLIT_COUNT,
  shouldOfferEpisodeSplit,
} from "@/lib/gigasocial/videoEpisodeSplit";
import {
  getAudioDuration,
  getVideoDuration,
  generateVideoThumbnail,
  isSocialVideoOverSizeLimit,
  uploadSocialImages,
  uploadSocialVideo,
  type SocialMediaUploadDeps,
} from "@/lib/gigasocial/mediaUpload";
import type { GigaCreateActionId } from "@/components/gigasocial/create/gigaCreateMenu";
import { GigaSocialComposerMeta } from "@/components/gigasocial/composer/GigaSocialComposerMeta";
import { GigaSocialTemplatePolicyPicker } from "@/components/gigasocial/template/GigaSocialTemplatePolicyPicker";
import { SoundLibraryPicker } from "@/components/gigaedit/SoundLibraryPicker";
import { soundAttributionLine } from "@/lib/gigaedit/soundLibrary";
import {
  GigaSocialComposerQuickActions,
  type ComposerQuickActionId,
} from "@/components/gigasocial/composer/GigaSocialComposerQuickActions";
import { GigaSocialAccountSwitcher } from "@/components/gigasocial/accounts/GigaSocialAccountSwitcher";
import type { SocialAccountSummary } from "@/lib/gigasocial/activeSocialAccount";
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
  GigaSocialEpisodeConfirm,
  type GigaSocialEpisodeConfirmResult,
} from "@/components/gigasocial/studio/GigaSocialEpisodeConfirm";
import {
  appendRemixMarker,
  buildRemixBodyPrefix,
  type GigaRemixModeId,
} from "@/lib/gigasocial/remixMeta";
import { POST_TYPE_OPTIONS, type SocialPostTypeId } from "@/lib/gigasocial/sections";
import type { GigaTemplatePolicy } from "@/lib/gigasocial/templateMeta";
import type { SocialPost } from "@/lib/gigasocial/types";
import { api } from "convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { Camera, Loader2, Send, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";

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

interface EpisodeSplitDraft {
  file: File;
  previewUrl: string;
  durationSec: number;
  reason: "oversized" | "creator";
}

export type GigaSocialComposerInitialMedia = {
  images?: File[];
  video?: File | null;
  audio?: File | null;
  soundAttribution?: string;
};

interface GigaSocialComposerProps {
  communitySlug?: string;
  disabled?: boolean;
  sessionToken: string;
  initialAction?: GigaCreateActionId;
  initialBody?: string;
  initialPostType?: SocialPostTypeId;
  /** Open camera studio with teleprompter on (AI Studio Script launch). */
  initialTeleprompter?: boolean;
  /** Prefill from GigaEdit publish handoff (files already on device). */
  initialMedia?: GigaSocialComposerInitialMedia | null;
  initialVisibility?: "public" | "followers";
  remixSource?: SocialPost;
  remixMode?: GigaRemixModeId;
  enableAIAssistant?: boolean;
  enableMediaStudio?: boolean;
  /** Dense sheet layout — less vertical chrome for mobile compose. */
  compact?: boolean;
  onPosted?: () => void;
  onFullscreenFlowChange?: (active: boolean) => void;
  onSubmit: (args: {
    body: string;
    postType: SocialPostTypeId;
    mediaItems?: SocialPostMediaItemInput[];
    communitySlug?: string;
    visibility?: "public" | "followers";
    profileId?: string;
    templatePolicy?: GigaTemplatePolicy;
  }) => Promise<void>;
  /** Active multi-account profile for this post. */
  profileId?: string;
  accounts?: SocialAccountSummary[];
  onActiveProfileChange?: (profileId: string) => void;
}

export const GigaSocialComposer = memo(function GigaSocialComposer({
  communitySlug,
  disabled,
  sessionToken,
  initialAction,
  initialBody,
  initialPostType,
  initialTeleprompter = false,
  initialMedia = null,
  initialVisibility,
  remixSource,
  remixMode = "classic",
  enableAIAssistant = false,
  enableMediaStudio = false,
  compact = false,
  profileId,
  accounts,
  onActiveProfileChange,
  onPosted,
  onFullscreenFlowChange,
  onSubmit,
}: GigaSocialComposerProps) {
  const features = useGigaSocialFeatures();
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<SocialPostTypeId>("text");
  const captionMaxLength = useMemo(() => socialCaptionMaxLength(postType), [postType]);
  const [visibility, setVisibility] = useState<"public" | "followers">(
    () => initialVisibility ?? "public"
  );
  const [templatePolicy, setTemplatePolicy] = useState<GigaTemplatePolicy>("off");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [imagePreparationCount, setImagePreparationCount] = useState(0);
  const reservedImageSlotsRef = useRef(0);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [videoTrimDraft, setVideoTrimDraft] = useState<VideoTrimDraft | null>(null);
  const [episodeSplitDraft, setEpisodeSplitDraft] = useState<EpisodeSplitDraft | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [audioPreparationCount, setAudioPreparationCount] = useState(0);
  const [soundAttribution, setSoundAttribution] = useState<string | null>(
    () => initialMedia?.soundAttribution ?? null
  );
  const [soundLibraryOpen, setSoundLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initialPickerTarget, setInitialPickerTarget] =
    useState<InitialMediaPickerTarget | null>(null);
  const [initialPickerLabel, setInitialPickerLabel] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [previewFilterId, setPreviewFilterId] = useState<CameraFilterId>("none");
  const [locationTag, setLocationTag] = useState("");
  const hasInitialMedia = Boolean(
    initialMedia?.video || initialMedia?.audio || (initialMedia?.images?.length ?? 0) > 0
  );
  const [cameraStudioOpen, setCameraStudioOpen] = useState(
    () =>
      !hasInitialMedia &&
      (initialAction === "media-camera" || initialAction === "story-content")
  );
  const gigaEditSeededRef = useRef(false);
  const [cameraDefaultMode, setCameraDefaultMode] = useState<"photo" | "video">(
    "photo"
  );
  const [mediaReviewDraft, setMediaReviewDraft] = useState<{
    file: File;
    kind: "image" | "video";
    filterId?: CameraFilterId;
    durationSec?: number;
  } | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const videoProbeAbortRef = useRef<AbortController | null>(null);
  const videoProbeGenerationRef = useRef(0);
  const [mediaProbeBusy, setMediaProbeBusy] = useState(false);
  const unifiedMediaInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef(true);
  const router = useRouter();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fullscreenFlowActive = Boolean(
    mediaReviewDraft || videoTrimDraft || episodeSplitDraft || cameraStudioOpen
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
    if (gigaEditSeededRef.current || !initialMedia) return;
    gigaEditSeededRef.current = true;
    let cancelled = false;
    void (async () => {
      if (initialVisibility) setVisibility(initialVisibility);
      if (initialMedia.soundAttribution) setSoundAttribution(initialMedia.soundAttribution);
      if (initialMedia.video) {
        try {
          const durationSec = await getVideoDuration(initialMedia.video);
          if (cancelled) return;
          if (needsVideoTrim(durationSec)) {
            clearVideoTrimDraft();
            setVideoTrimDraft({
              file: initialMedia.video,
              previewUrl: URL.createObjectURL(initialMedia.video),
              durationSec,
            });
            setPostType("video");
            setSuccess("GigaEdit video loaded — trim if needed, then post.");
          } else {
            applyPendingVideo({ file: initialMedia.video, durationSec });
            setSuccess("GigaEdit project loaded — ready to publish to GigaSocial.");
          }
        } catch {
          if (!cancelled) setError("Could not load GigaEdit video into composer.");
        }
      } else if (initialMedia.images?.length) {
        await addImageFiles(initialMedia.images);
        if (!cancelled) setSuccess("GigaEdit photo loaded — ready to publish.");
      }
      if (initialMedia.audio && !cancelled) {
        try {
          const prepared = await prepareAudioForPhotoPost(initialMedia.audio);
          if (cancelled) return;
          setPendingAudio({
            file: prepared.file,
            name: prepared.file.name,
            durationSec: prepared.durationSec,
          });
        } catch {
          /* optional audio */
        }
      }
      if (initialBody && !cancelled) setBody(initialBody);
    })();
    return () => {
      cancelled = true;
    };
    // Seed once from handoff — intentional sparse deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMedia]);

  useEffect(() => {
    if (initialMedia) {
      if (initialBody) setBody(initialBody);
      if (initialPostType) setPostType(initialPostType);
      if (initialAction === "story-content") {
        setBody((value) => value.trim() || initialBody || "✨ Story\n\n#story");
        // Keep seeded media type (photo or video) — do not force video-only stories.
        if (!initialPostType && !initialMedia?.video) setPostType("image");
      }
      return;
    }
    if (!initialAction && !remixSource && !initialBody) return;
    if (remixSource) {
      const prefix = buildRemixBodyPrefix({
        sourcePostId: remixSource._id,
        sourceAuthorHandle: remixSource.author.handle,
        sourceAuthorName: remixSource.author.displayName,
        mode: remixMode,
      });
      setBody(`${prefix}My take: `);
      setPostType(
        remixMode === "voice-over" ||
          remixMode === "reaction" ||
          remixMode === "split-view" ||
          remixMode === "green-screen" ||
          remixMode === "clip-reply" ||
          remixMode === "ai-subtitles"
          ? "video"
          : remixSource.postType
      );
      // Keep the original video/audio attached to the remix composition.
      void import("@/lib/gigasocial/remixSourceAttach").then(async ({ attachRemixSourceMedia }) => {
        try {
          setBusy(true);
          setPendingVideo((current) => {
            if (current?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(current.previewUrl);
            return null;
          });
          setPendingImages((prev) => {
            for (const image of prev) {
              if (image.previewUrl.startsWith("blob:")) URL.revokeObjectURL(image.previewUrl);
            }
            return [];
          });
          setPendingAudio(null);
          const attached = await attachRemixSourceMedia(remixSource, remixMode);
          if (attached.video) {
            const previewUrl = URL.createObjectURL(attached.video);
            let thumbnailUrl: string | undefined;
            try {
              thumbnailUrl = await generateVideoThumbnail(attached.video);
            } catch {
              /* optional */
            }
            setPendingVideo({
              file: attached.video,
              previewUrl,
              name: attached.video.name,
              durationSec: attached.videoDurationSec ?? 0,
              thumbnailUrl,
            });
            setPostType("video");
          } else if (attached.images?.length) {
            setPendingImages(
              attached.images.map((file, index) => ({
                id: `remix-${remixSource._id}-${index}`,
                file,
                previewUrl: URL.createObjectURL(file),
                name: file.name,
              }))
            );
            setPostType("image");
          }
          if (attached.audio) {
            setPendingAudio({
              file: attached.audio,
              name: attached.audio.name,
              durationSec: 0,
            });
            if (attached.soundAttribution) setSoundAttribution(attached.soundAttribution);
          }
          if (!attached.video && !attached.images?.length && !attached.audio) {
            setError("Could not attach the original media. Check your connection and try again.");
          } else {
            setSuccess("Original media attached — add your take, then post.");
          }
        } catch {
          setError("Could not attach the original media for this remix.");
        } finally {
          setBusy(false);
        }
      });
      return;
    }
    if (initialBody) setBody(initialBody);
    if (initialPostType) setPostType(initialPostType);
    if (!initialAction) {
      queueMicrotask(() => captionRef.current?.focus());
      return;
    }
    const initialPickerIntent = resolveInitialMediaPickerIntent(initialAction);
    switch (initialAction) {
      case "video-studio":
      case "media-video":
        setPostType("video");
        if (initialPickerIntent) {
          setInitialPickerTarget(initialPickerIntent.target);
          setInitialPickerLabel(initialPickerIntent.ctaLabel);
          setSuccess(initialPickerIntent.notice);
        }
        break;
      case "photo-studio":
      case "media-photo":
        setPostType("image");
        if (initialPickerIntent) {
          setInitialPickerTarget(initialPickerIntent.target);
          setInitialPickerLabel(initialPickerIntent.ctaLabel);
          setSuccess(initialPickerIntent.notice);
        }
        setStudioOpen(true);
        break;
      case "media-unified":
        setPostType("image");
        if (initialPickerIntent) {
          setInitialPickerTarget(initialPickerIntent.target);
          setInitialPickerLabel(initialPickerIntent.ctaLabel);
          setSuccess(initialPickerIntent.notice);
        }
        break;
      case "media-camera":
        setPostType("image");
        setCameraDefaultMode("photo");
        setCameraStudioOpen(true);
        break;
      case "story-content":
        setPostType("image");
        setBody((value) => value.trim() || initialBody || "✨ Story\n\n#story");
        setCameraDefaultMode("photo");
        setCameraStudioOpen(true);
        break;
      case "media-audio":
        setPostType("image");
        if (initialPickerIntent) {
          setInitialPickerTarget(initialPickerIntent.target);
          setInitialPickerLabel(initialPickerIntent.ctaLabel);
          setSuccess(initialPickerIntent.notice);
        }
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
  }, [initialAction, initialBody, initialMedia, initialPostType, remixMode, remixSource]);

  const hasMedia = pendingImages.length > 0 || Boolean(pendingVideo) || Boolean(pendingAudio);
  const imagePreparationBusy = imagePreparationCount > 0;
  const audioPreparationBusy = audioPreparationCount > 0;
  const canPost = Boolean(body.trim() || hasMedia) && !imagePreparationBusy && !audioPreparationBusy;

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

  const clearEpisodeSplitDraft = useCallback(() => {
    setEpisodeSplitDraft((current) => {
      if (current) revokePreview(current.previewUrl);
      return null;
    });
  }, [revokePreview]);

  const openEpisodeSplitDraft = useCallback(
    (args: {
      file: File;
      durationSec: number;
      reason: "oversized" | "creator";
    }) => {
      clearVideoTrimDraft();
      setEpisodeSplitDraft((current) => {
        if (current) revokePreview(current.previewUrl);
        return {
          file: args.file,
          previewUrl: URL.createObjectURL(args.file),
          durationSec: args.durationSec,
          reason: args.reason,
        };
      });
      setPostType("video");
      setError(null);
      if (args.reason === "oversized") {
        setSuccess(
          `Video is over ${SOCIAL_MAX_VIDEO_MB} MB. Review the ${SOCIAL_EPISODE_SPLIT_COUNT} episode names, then confirm upload.`
        );
      } else {
        setSuccess(`Name your ${SOCIAL_EPISODE_SPLIT_COUNT} episodes, then confirm upload.`);
      }
    },
    [clearVideoTrimDraft, revokePreview]
  );

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
        setSuccess(`Video trimmed to ${SOCIAL_MAX_VIDEO_DURATION_MIN} minutes for GigaSocial.`);
      }
    },
    [revokePreview]
  );

  const clearPendingMedia = useCallback(() => {
    pendingImages.forEach((image) => revokePreview(image.previewUrl));
    if (pendingVideo) revokePreview(pendingVideo.previewUrl);
    clearVideoTrimDraft();
    clearEpisodeSplitDraft();
    setPendingImages([]);
    setPendingVideo(null);
    setPendingAudio(null);
    setPreviewFilterId("none");
  }, [clearEpisodeSplitDraft, clearVideoTrimDraft, pendingImages, pendingVideo, revokePreview]);

  const addImageFiles = useCallback(
    async (files: FileList | File[], autoBrighten = true) => {
      if (pendingVideo || mediaReviewDraft?.kind === "video") {
        setError("Finish or remove the selected video before adding photos.");
        return;
      }
      const list = Array.from(files).filter((file) => Boolean(resolveImageContentType(file)));
      if (!list.length) {
        setError("Choose JPG, PNG, or WEBP images.");
        return;
      }
      const available = Math.max(0, SOCIAL_MAX_PHOTOS_PER_POST - pendingImages.length - reservedImageSlotsRef.current);
      if (available <= 0) {
        setError(`You can attach up to ${SOCIAL_MAX_PHOTOS_PER_POST} photos.`);
        return;
      }
      const selected = list.slice(0, available);
      reservedImageSlotsRef.current += selected.length;
      setImagePreparationCount((count) => count + 1);
      try {
        const prepared: File[] = [];
        for (const file of selected) prepared.push(autoBrighten ? await brightenSocialPhoto(file) : file);
        // The composer can be dismissed while browser image decoding/encoding is
        // still running. Do not allocate preview blob URLs for an unmounted sheet.
        if (!mountedRef.current) return;
        const next = prepared.map((file) => ({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
        }));
        setPendingImages((prev) => {
          const slots = Math.max(0, SOCIAL_MAX_PHOTOS_PER_POST - prev.length);
          const accepted = next.slice(0, slots);
          next.slice(slots).forEach((image) => URL.revokeObjectURL(image.previewUrl));
          return [...prev, ...accepted];
        });
        setPostType("image");
        setError(null);
      } finally {
        reservedImageSlotsRef.current = Math.max(0, reservedImageSlotsRef.current - selected.length);
        if (mountedRef.current) {
          setImagePreparationCount((count) => Math.max(0, count - 1));
        }
      }
    },
    [mediaReviewDraft?.kind, pendingImages.length, pendingVideo]
  );

  const addVideoFile = useCallback(async (file: File) => {
    if (pendingImages.length || pendingAudio || reservedImageSlotsRef.current > 0 || imagePreparationCount > 0) {
      setError("Wait for photo preparation to finish, or remove photos and music before adding a video.");
      return;
    }
    if (!resolveVideoContentType(file)) {
      setError("Unsupported video type. Use MP4, MOV, or WebM.");
      return;
    }
    if (isSocialVideoOverSizeLimit(file) && file.size > 0) {
      // Still probe duration — oversized long clips may use episode split.
    }

    videoProbeAbortRef.current?.abort();
    const controller = new AbortController();
    videoProbeAbortRef.current = controller;
    const generation = videoProbeGenerationRef.current + 1;
    videoProbeGenerationRef.current = generation;
    // Show the selected file immediately. Android's metadata decoder can be slow
    // or fail for otherwise playable gallery videos, so duration must not gate preview.
    setMediaReviewDraft({ file, kind: "video" });
    setPostType("video");
    setError(null);
    setSuccess(null);
    setMediaProbeBusy(true);

    void getVideoDuration(file, { signal: controller.signal })
      .then((durationSec) => {
        if (generation !== videoProbeGenerationRef.current) return;
        if (isUsableVideoDuration(durationSec)) {
          setMediaReviewDraft((current) =>
            current?.file === file ? { ...current, durationSec } : current
          );
        }
        // An unreadable duration does not discard the selected file. The review
        // remains available; publishing retries validation and will not bypass limits.
      })
      .catch((e: unknown) => {
        if (generation !== videoProbeGenerationRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        // Keep the preview visible; duration is checked again before attachment.
      })
      .finally(() => {
        if (generation === videoProbeGenerationRef.current) {
          setMediaProbeBusy(false);
          if (videoProbeAbortRef.current === controller) {
            videoProbeAbortRef.current = null;
          }
        }
      });
  }, [imagePreparationCount, pendingAudio, pendingImages.length]);

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
        if (reservedImageSlotsRef.current > 0 || imagePreparationCount > 0 || pendingImages.length > 0) {
          setError("Finish or remove photo preparation before adding a video.");
          setMediaReviewDraft(null);
          return;
        }
        let durationSec =
          result.durationSec && isUsableVideoDuration(result.durationSec)
            ? result.durationSec
            : 0;
        if (!isUsableVideoDuration(durationSec)) {
          try {
            durationSec = await getVideoDuration(result.file);
          } catch (e) {
            setError(
              e instanceof Error
                ? `Could not verify this video's length. The video is still selected; try another file or retry.`
                : "Could not verify this video's length. The video is still selected; try another file or retry."
            );
            // Keep the review open so a metadata read failure never loses the
            // selected file. Publishing remains blocked until duration validates.
            return;
          }
        }
        if (needsVideoTrim(durationSec)) {
          clearVideoTrimDraft();
          setVideoTrimDraft({
            file: result.file,
            previewUrl: URL.createObjectURL(result.file),
            durationSec,
          });
          setPostType("video");
          setSuccess(
            `This video is ${Math.ceil(durationSec)}s. Shorten it (${VIDEO_CLIP_LENGTH_OPTIONS_SEC.map((sec) => `${sec / 60} min`).join(" / ")}), then post.`
          );
        } else if (shouldOfferEpisodeSplit(result.file.size, durationSec)) {
          openEpisodeSplitDraft({
            file: result.file,
            durationSec,
            reason: "oversized",
          });
        } else if (isSocialVideoOverSizeLimit(result.file)) {
          setError(
            `Video is too large (maximum ${SOCIAL_MAX_VIDEO_MB} MB). Compress it, or use a longer clip so we can split it into ${SOCIAL_EPISODE_SPLIT_COUNT} episodes.`
          );
        } else {
          applyPendingVideo({
            file: result.file,
            durationSec,
            thumbnailUrl: result.thumbnailUrl,
          });
        }
      } else {
        await addImageFiles([result.file]);
        setSuccess("Photo added. Automatic enhancement is applied when supported; your original is preserved if it is not.");
      }
      setMediaReviewDraft(null);
    },
    [addImageFiles, applyPendingVideo, clearVideoTrimDraft, imagePreparationCount, openEpisodeSplitDraft, pendingImages.length]
  );

  const addAudioFile = useCallback(async (file: File, imagesPreparedInThisSelection = false) => {
    // Use the live reservation ref here: this callback may run after awaiting
    // addImageFiles, while its captured React state still reflects the prior render.
    if (reservedImageSlotsRef.current > 0) {
      setError("Wait for photo preparation to finish before adding music.");
      return;
    }
    if (pendingVideo) {
      setError("Remove the video before adding music.");
      return;
    }
    if (!pendingImages.length && !imagesPreparedInThisSelection) {
      setError("Add one or more photos first, then attach music.");
      return;
    }
    setAudioPreparationCount((count) => count + 1);
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
    } finally {
      if (mountedRef.current) {
        setAudioPreparationCount((count) => Math.max(0, count - 1));
      }
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
          await addAudioFile(selection.audio, true);
          if (!body.trim()) {
            setBody("Photo with music 🎵\n\n");
          }
          setSuccess(
            `Photo + music will publish as a ${SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC}s video with your soundtrack.`
          );
          break;
        case "video-with-audio":
          await addVideoFile(selection.video);
          if (selection.audio) {
            setSuccess(
              "Video selected. To add a soundtrack, post a photo with music (exports as video + audio)."
            );
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
    async (files: File[]) => {
      if (!files.length) return;
      await addDroppedFiles(files);
    },
    [addDroppedFiles]
  );

  function readInputFilesAndReset(input: HTMLInputElement): File[] {
    const files = input.files ? Array.from(input.files) : [];
    // Snapshot before reset: Android/TWA may detach a live FileList after clearing.
    input.value = "";
    return files;
  }

  const openMediaPicker = useCallback((target: InitialMediaPickerTarget) => {
    switch (target) {
      case "unified":
        unifiedMediaInputRef.current?.click();
        break;
      case "image":
        imageInputRef.current?.click();
        break;
      case "video":
        videoInputRef.current?.click();
        break;
      case "audio":
        audioInputRef.current?.click();
        break;
      default:
        break;
    }
  }, []);

  const handleCreateAction = useCallback(
    (action: CreateMediaAction) => {
      switch (action) {
        case "media":
          openMediaPicker("unified");
          break;
        case "photo":
          setCameraDefaultMode("photo");
          setCameraStudioOpen(true);
          break;
        case "photos":
          openMediaPicker("image");
          break;
        case "video":
          openMediaPicker("video");
          break;
        case "music":
          setSoundLibraryOpen(true);
          break;
        case "templates":
          router.push("/creator-studio?tab=image");
          break;
        default:
          break;
      }
    },
    [openMediaPicker, router]
  );

  const handleQuickAction = useCallback(
    (action: ComposerQuickActionId) => {
      switch (action) {
        case "photo":
          openMediaPicker("image");
          break;
        case "video":
          openMediaPicker("video");
          break;
        case "camera":
          setCameraDefaultMode("photo");
          setCameraStudioOpen(true);
          break;
        case "feeling":
          setBody((value) => `${value}✨`);
          captionRef.current?.focus();
          break;
        case "location":
          document
            .querySelector<HTMLInputElement>("#gigasocial-composer input[placeholder^='Location']")
            ?.focus();
          break;
        case "ai":
          document.getElementById("gigasocial-ai-assistant")?.scrollIntoView({
            block: "nearest",
            behavior: window.matchMedia("(max-width: 1023px)").matches ? "auto" : "smooth",
          });
          break;
        default:
          break;
      }
    },
    [openMediaPicker]
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

  async function publishEpisodeSeries(result: GigaSocialEpisodeConfirmResult) {
    if (busy || disabled) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    setUploadPercent(0);
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      const total = result.episodes.length;
      for (let i = 0; i < total; i += 1) {
        const episode = result.episodes[i];
        setSuccess(`Uploading episode ${i + 1} of ${total}…`);
        const uploaded = await uploadSocialVideo(uploadDeps, episode.file, {
          signal: controller.signal,
          onProgress: (progress) => {
            const overall = Math.round(((i + progress.percent / 100) / total) * 100);
            setUploadPercent(overall);
          },
        });
        let finalBody = episode.body.trim();
        if (locationTag.trim()) {
          finalBody = `${finalBody}\n📍 ${locationTag.trim()}`.trim();
        }
        if (soundAttribution && !finalBody.includes(soundAttribution)) {
          finalBody = `${finalBody}\n🎵 ${soundAttribution}`.trim();
        }
        await onSubmit({
          body: finalBody,
          postType: "video",
          mediaItems: [uploaded],
          communitySlug,
          visibility,
          profileId,
          ...(features.enableUseAsTemplate ? { templatePolicy } : {}),
        });
      }
      setBody("");
      clearPendingMedia();
      setSoundAttribution(null);
      setPostType("text");
      setSuccess(`Published ${total} episodes successfully.`);
      onPosted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish episodes.");
    } finally {
      uploadAbortRef.current = null;
      setBusy(false);
      setUploadPercent(null);
    }
  }

  async function handleSubmit() {
    if (busy || disabled || imagePreparationBusy || audioPreparationBusy || !canPost) return;
    if (
      pendingVideo &&
      shouldOfferEpisodeSplit(pendingVideo.file.size, pendingVideo.durationSec)
    ) {
      openEpisodeSplitDraft({
        file: pendingVideo.file,
        durationSec: pendingVideo.durationSec,
        reason: "oversized",
      });
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    setUploadPercent(0);
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      let mediaItems: SocialPostMediaItemInput[] | undefined;
      let publishPostType = postType;
      if (pendingVideo) {
        const uploaded = await uploadSocialVideo(uploadDeps, pendingVideo.file, {
          signal: controller.signal,
          onProgress: (progress) => setUploadPercent(progress.percent),
        });
        mediaItems = [uploaded];
        publishPostType = "video";
      } else if (pendingImages.length && pendingAudio) {
        setSuccess("Mixing photo + music into a video…");
        const composed = await composePhotoMusicVideo(
          pendingImages.map((image) => image.file),
          pendingAudio.file,
          {
            maxDurationSec: SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC,
            filterCss: getCameraFilterCss(
              previewFilterId === "none" ? undefined : previewFilterId
            ),
            signal: controller.signal,
            onProgress: (percent) => setUploadPercent(Math.round(percent * 70)),
          }
        );
        const uploaded = await uploadSocialVideo(uploadDeps, composed.file, {
          signal: controller.signal,
          onProgress: (progress) =>
            setUploadPercent(70 + Math.round(progress.percent * 0.3)),
        });
        mediaItems = [
          {
            ...uploaded,
            // Marker for music feed filters; camera look is already baked into frames.
            filterId: "photo-music",
          },
        ];
        publishPostType = "video";
      } else if (pendingImages.length) {
        const imageFiles = pendingImages.map((image) => image.file);
        const uploadedImages = await uploadSocialImages(uploadDeps, imageFiles, {
          filterId: previewFilterId === "none" ? undefined : previewFilterId,
          signal: controller.signal,
          fastCompress: true,
          onProgress: (_index, progress) => setUploadPercent(progress.percent),
        });
        mediaItems = [...uploadedImages];
      }

      let finalBody = body.trim();
      if (locationTag.trim()) {
        finalBody = `${finalBody}\n📍 ${locationTag.trim()}`.trim();
      }
      if (remixSource) {
        finalBody = appendRemixMarker(finalBody, remixSource._id, remixMode);
      }
      if (pendingImages.length && pendingAudio && !/#photomusic\b/i.test(finalBody)) {
        finalBody = `${finalBody} #PhotoMusic`.trim();
      }
      if (
        initialAction === "story-content" &&
        (pendingVideo || pendingImages.length) &&
        !/#story\b/i.test(finalBody)
      ) {
        finalBody = `${finalBody}\n#story`.trim();
      }
      if (soundAttribution && !finalBody.includes(soundAttribution)) {
        finalBody = `${finalBody}\n🎵 ${soundAttribution}`.trim();
      }

      await onSubmit({
        body: finalBody,
        postType: publishPostType,
        mediaItems,
        communitySlug,
        visibility,
        profileId,
        ...(features.enableUseAsTemplate ? { templatePolicy } : {}),
      });

      setBody("");
      clearPendingMedia();
      setSoundAttribution(null);
      setPostType("text");
      setSuccess("Post published successfully.");
      onPosted?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create post.";
      if (
        pendingVideo &&
        /too large/i.test(message) &&
        shouldOfferEpisodeSplit(pendingVideo.file.size, pendingVideo.durationSec)
      ) {
        openEpisodeSplitDraft({
          file: pendingVideo.file,
          durationSec: pendingVideo.durationSec,
          reason: "oversized",
        });
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      uploadAbortRef.current = null;
      setBusy(false);
      setUploadPercent(null);
    }
  }

  if (episodeSplitDraft) {
    return (
      <GigaSocialEpisodeConfirm
        file={episodeSplitDraft.file}
        previewUrl={episodeSplitDraft.previewUrl}
        durationSec={episodeSplitDraft.durationSec}
        caption={body}
        reason={episodeSplitDraft.reason}
        onCancel={clearEpisodeSplitDraft}
        onConfirm={(result) => {
          clearEpisodeSplitDraft();
          void publishEpisodeSeries(result);
        }}
      />
    );
  }

  if (mediaReviewDraft) {
    // File inputs must stay mounted while the review screen is shown so Replace
    // can open the picker synchronously from the tap (Android Chrome/TWA gesture rule).
    return (
      <>
        <input
          ref={videoInputRef}
          type="file"
          accept={SOCIAL_VIDEO_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const files = readInputFilesAndReset(event.currentTarget);
            if (files[0]) void addVideoFile(files[0]);
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept={SOCIAL_IMAGE_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = readInputFilesAndReset(event.currentTarget);
            setMediaReviewDraft(null);
            if (files.length) void addImageFiles(files);
          }}
        />
        <GigaSocialMediaReview
          open
          file={mediaReviewDraft.file}
          kind={mediaReviewDraft.kind}
          filterId={mediaReviewDraft.filterId}
          durationSec={mediaReviewDraft.durationSec}
          postType={postType}
          enableAI={enableAIAssistant}
          onClose={() => setMediaReviewDraft(null)}
          onRemove={() => setMediaReviewDraft(null)}
          onReplace={() => {
            if (mediaReviewDraft.kind === "video") {
              videoInputRef.current?.click();
            } else {
              imageInputRef.current?.click();
            }
          }}
          onSkip={handleMediaReviewComplete}
        />
      </>
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
          if (shouldOfferEpisodeSplit(result.file.size, result.durationSec)) {
            openEpisodeSplitDraft({
              file: result.file,
              durationSec: result.durationSec,
              reason: "oversized",
            });
            return;
          }
          if (isSocialVideoOverSizeLimit(result.file)) {
            setError(
              `Trimmed video is still over ${SOCIAL_MAX_VIDEO_MB} MB. Compress it further or split a longer source into ${SOCIAL_EPISODE_SPLIT_COUNT} episodes.`
            );
            return;
          }
          applyPendingVideo(result);
        }}
      />
    );
  }

  return (
    <>
    <div
      id="gigasocial-composer"
      className={
        compact
          ? "space-y-2"
          : "saas-card space-y-2 rounded-2xl border border-border p-4"
      }
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
      {accounts && accounts.length > 1 && onActiveProfileChange ? (
        <GigaSocialAccountSwitcher
          accounts={accounts}
          activeProfileId={profileId ?? null}
          onChange={onActiveProfileChange}
          compact={compact}
        />
      ) : null}
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
        compact={compact}
      />
      {features.enableUseAsTemplate ? (
        <GigaSocialTemplatePolicyPicker
          value={templatePolicy}
          onChange={setTemplatePolicy}
          disabled={disabled || busy}
          compact={compact}
        />
      ) : null}
      {soundAttribution ? (
        <p className="rounded-lg border border-amber-200/40 bg-amber-50/80 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
          🎵 {soundAttribution}
        </p>
      ) : null}
      {initialMedia ? (
        <p className="text-[11px] text-muted">
          From GigaEdit · original media preserved separately on your device
        </p>
      ) : null}
      {soundLibraryOpen ? (
        <div className="space-y-2 rounded-xl border border-border p-2">
          <SoundLibraryPicker
            onClose={() => setSoundLibraryOpen(false)}
            onSelect={(sound, file) => {
              void (async () => {
                try {
                  const prepared = await prepareAudioForPhotoPost(file);
                  setPendingAudio({
                    file: prepared.file,
                    name: prepared.file.name,
                    durationSec: prepared.durationSec || (await getAudioDuration(prepared.file).catch(() => 0)),
                  });
                  setSoundAttribution(soundAttributionLine(sound));
                  setSoundLibraryOpen(false);
                  setSuccess(`Using ${soundAttributionLine(sound)}`);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not attach sound.");
                }
              })();
            }}
          />
          <button
            type="button"
            className="w-full rounded-lg border border-border px-3 py-2 text-xs text-muted"
            onClick={() => {
              setSoundLibraryOpen(false);
              audioInputRef.current?.click();
            }}
          >
            Import audio from this device instead
          </button>
        </div>
      ) : null}
      <textarea
        id="gigasocial-caption"
        ref={captionRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={compact ? 2 : 4}
        maxLength={captionMaxLength}
        placeholder="Share your thoughts with the world..."
        className={
          compact
            ? "max-h-28 w-full resize-none overflow-y-auto rounded-xl border border-border bg-white px-3 py-2 text-sm"
            : "w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
        }
        disabled={disabled || busy}
      />
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {body.length}/{captionMaxLength}
        </span>
        {detectedHashtagPreview ? (
          <span className="max-w-[58%] truncate text-[11px] text-muted" aria-label="Detected hashtags">
            {detectedHashtagPreview}
          </span>
        ) : null}
      </div>

      <GigaSocialComposerQuickActions
        disabled={disabled || busy}
        onAction={handleQuickAction}
      />

      {enableAIAssistant ? (
        <div id="gigasocial-ai-assistant">
          <GigaSocialAIAssistant
            body={body}
            postType={postType}
            compact={compact}
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
        compact={compact}
        onRemoveImage={(id) => {
          // Keep the selected photo set stable while soundtrack preparation is
          // running; otherwise the completed audio could be orphaned from its photos.
          if (audioPreparationBusy) return;
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

      {pendingVideo && canOptionalEpisodeSplit(pendingVideo.durationSec) ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={disabled || busy}
          onClick={() =>
            openEpisodeSplitDraft({
              file: pendingVideo.file,
              durationSec: pendingVideo.durationSec,
              reason: "creator",
            })
          }
        >
          Split into {SOCIAL_EPISODE_SPLIT_COUNT} episodes
        </Button>
      ) : null}

      <CreatorTemplateQuickPick compact={compact} />

      {enableMediaStudio && studioOpen && studioPreviewUrl ? (
        <div className={compact ? "mt-1" : "mt-3"}>
          <GigaSocialMediaStudio
            previewUrl={studioPreviewUrl}
            onClose={() => setStudioOpen(false)}
            onApplyFilter={(filterId) => setPreviewFilterId(filterId)}
          />
        </div>
      ) : null}

      {dragActive ? (
        <p className="rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-xs text-accent">
          Drop photos or a short video
        </p>
      ) : compact ? null : (
        <p className="text-xs text-muted">
          Add photos + music (publishes as a {SOCIAL_PHOTO_MUSIC_MAX_DURATION_SEC}s video with
          soundtrack), or a video up to {SOCIAL_MAX_VIDEO_MB} MB /{" "}
          {SOCIAL_MAX_VIDEO_DURATION_MIN} min. Oversized long videos can be split into{" "}
          {SOCIAL_EPISODE_SPLIT_COUNT} named episodes before upload.
        </p>
      )}

      {mediaProbeBusy ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-border bg-muted/10 px-3 py-2 text-xs text-muted"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Reading video duration…
        </div>
      ) : null}

      {uploadPercent !== null && busy ? (
        <div className="space-y-1.5" role="status" aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/20">
            <div
              className="h-full rounded-full bg-accent"
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

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={unifiedMediaInputRef}
          type="file"
          accept={UNIFIED_MEDIA_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = readInputFilesAndReset(event.currentTarget);
            void handleUnifiedMediaPick(files);
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept={SOCIAL_IMAGE_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = readInputFilesAndReset(event.currentTarget);
            if (files.length) void addImageFiles(files);
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept={SOCIAL_VIDEO_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const files = readInputFilesAndReset(event.currentTarget);
            if (files[0]) void addVideoFile(files[0]);
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const files = readInputFilesAndReset(event.currentTarget);
            const file = files[0];
            if (!file) return;
            if (isLikelySocialVideoFile(file)) {
              void addVideoFile(file);
            } else {
              void addImageFiles(files);
            }
          }}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept={SOCIAL_AUDIO_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const files = readInputFilesAndReset(event.currentTarget);
            if (files[0]) void addAudioFile(files[0]);
          }}
        />

        <label
          className="relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 overflow-hidden rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/5 focus-within:ring-2 focus-within:ring-accent"
          aria-label="Choose a video from your phone"
        >
          <Video className="h-4 w-4" aria-hidden />
          Upload video
          <input
            type="file"
            accept="video/*,.mp4,.mov,.webm,.m4v,.3gp,.3g2"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={disabled || busy}
            onChange={(event) => {
              const input = event.currentTarget;
              const selected = input.files ? Array.from(input.files) : [];
              input.value = "";
              if (!selected.length) {
                setError("Your phone did not return a video file. Please try choosing the video again.");
                return;
              }
              void addVideoFile(selected[0]);
            }}
          />
        </label>
        <GigaSocialCreateMediaMenu
          disabled={disabled}
          busy={busy}
          canAddMusic={pendingImages.length > 0 && !pendingVideo}
          onAction={handleCreateAction}
        />
        {initialPickerTarget && initialPickerLabel ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => {
              openMediaPicker(initialPickerTarget);
              setInitialPickerTarget(null);
              setInitialPickerLabel(null);
            }}
          >
            {initialPickerLabel}
          </Button>
        ) : null}
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
          disabled={disabled || busy || imagePreparationBusy || audioPreparationBusy || !canPost}
          onClick={() => void handleSubmit()}
          className="ml-auto min-h-10"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post
        </Button>
      </div>

      {success ? (
        <p className="text-xs text-green-700" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
    <GigaSocialCameraStudio
      open={cameraStudioOpen}
      defaultMode={cameraDefaultMode}
      initialTeleprompter={initialTeleprompter}
      onClose={() => setCameraStudioOpen(false)}
      onCapture={handleCameraCapture}
    />
    </>
  );
});
