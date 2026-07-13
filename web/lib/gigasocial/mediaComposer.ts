/**
 * Classifies user-selected files for the unified Media Composer.
 */

export type MediaComposerSelection =
  | { kind: "single-image"; files: File[] }
  | { kind: "single-video"; files: File[] }
  | { kind: "photo-gallery"; files: File[] }
  | { kind: "slideshow"; images: File[]; audio: File }
  | { kind: "video-with-audio"; video: File; audio?: File }
  | { kind: "mixed-timeline"; images: File[]; video?: File; audio?: File }
  | { kind: "unsupported"; reason: string };

export function classifyMediaFiles(files: File[]): MediaComposerSelection {
  const images = files.filter((f) => f.type.startsWith("image/"));
  const videos = files.filter((f) => f.type.startsWith("video/"));
  const audios = files.filter((f) => f.type.startsWith("audio/"));

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
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm";
