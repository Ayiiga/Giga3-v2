/**
 * Classifies user-selected files for the unified Media Composer.
 * Android gallery picks often omit MIME types — fall back to extensions.
 */

import {
  isLikelySocialVideoFile,
  resolveAudioContentType,
  resolveVideoContentType,
  SOCIAL_IMAGE_MIME_TYPES,
  resolveImageContentType,
} from "@/lib/gigasocial/constants";

export type MediaComposerSelection =
  | { kind: "single-image"; files: File[] }
  | { kind: "single-video"; files: File[] }
  | { kind: "photo-gallery"; files: File[] }
  | { kind: "slideshow"; images: File[]; audio: File }
  | { kind: "video-with-audio"; video: File; audio?: File }
  | { kind: "mixed-timeline"; images: File[]; video?: File; audio?: File }
  | { kind: "unsupported"; reason: string };

function isImageFile(file: File): boolean {
  return Boolean(resolveImageContentType(file));
}

function isVideoFile(file: File): boolean {
  return isLikelySocialVideoFile(file);
}

function isAudioFile(file: File): boolean {
  if (file.type?.toLowerCase().startsWith("audio/")) return true;
  return Boolean(resolveAudioContentType(file));
}

export function classifyMediaFiles(files: File[]): MediaComposerSelection {
  const images = files.filter(isImageFile);
  const videos = files.filter(isVideoFile);
  const audios = files.filter(isAudioFile);

  if (!images.length && !videos.length && !audios.length) {
    return { kind: "unsupported", reason: "Choose photos, videos, or music files." };
  }

  if (videos.length > 1) {
    return { kind: "unsupported", reason: "Select one video at a time." };
  }

  if (audios.length > 1) {
    return { kind: "unsupported", reason: "Select one music track at a time." };
  }

  const video = videos[0];
  const audio = audios[0];

  if (video && !resolveVideoContentType(video)) {
    return {
      kind: "unsupported",
      reason: "Unsupported video type. Use MP4, MOV, or WebM.",
    };
  }

  if (video && images.length > 0) {
    return { kind: "mixed-timeline", images, video, audio };
  }

  if (video && audio) {
    return { kind: "video-with-audio", video, audio };
  }

  if (video) {
    return { kind: "single-video", files: [video] };
  }

  if (images.length === 1 && !audio) {
    return { kind: "single-image", files: images };
  }

  if (images.length > 1 && audio) {
    return { kind: "slideshow", images, audio };
  }

  if (images.length > 1) {
    return { kind: "photo-gallery", files: images };
  }

  if (images.length > 0 && audio) {
    return { kind: "slideshow", images, audio };
  }

  if (audio && !images.length) {
    return { kind: "unsupported", reason: "Add at least one photo before attaching music." };
  }

  return { kind: "unsupported", reason: "Could not classify media selection." };
}

export const UNIFIED_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,video/mp4,video/quicktime,video/webm,video/*,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,.mp4,.mov,.webm,.m4v,.3gp";
