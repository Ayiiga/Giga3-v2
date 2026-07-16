import type { AttachmentKind } from "@/lib/chat/multimodalAttachments";

export const CHAT_UNIFIED_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,.txt,.md,.markdown,.csv,.json,.xml,.html,.htm,.yaml,.yml,.log,.rtf,.tex,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,text/*,application/json,application/pdf";

export type ChatMediaPickIntent =
  | { kind: AttachmentKind; files: File[] }
  | { kind: "unsupported"; reason: string };

/** Classify a multi-file pick for the chat unified media input. */
export function classifyChatMediaFiles(files: File[]): ChatMediaPickIntent {
  if (!files.length) {
    return { kind: "unsupported", reason: "No files selected." };
  }

  const images = files.filter((file) => file.type.startsWith("image/"));
  const videos = files.filter((file) => file.type.startsWith("video/"));
  const audios = files.filter((file) => file.type.startsWith("audio/"));
  const others = files.filter(
    (file) =>
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/") &&
      !file.type.startsWith("audio/")
  );

  if (videos.length > 1) {
    return { kind: "unsupported", reason: "Select one video at a time in chat." };
  }

  if (videos.length === 1 && (images.length > 0 || audios.length > 0)) {
    return {
      kind: "unsupported",
      reason: "Attach a video separately from photos or audio.",
    };
  }

  if (videos.length === 1) {
    return { kind: "video", files: [videos[0]] };
  }

  if (images.length > 0 && audios.length === 0 && others.length === 0) {
    return { kind: images.length === 1 ? "camera" : "image", files: images };
  }

  if (images.length > 0 && audios.length > 0 && others.length === 0) {
    return { kind: "image", files: [...images, ...audios] };
  }

  if (audios.length > 0 && images.length === 0 && others.length === 0) {
    return { kind: "file", files: audios };
  }

  if (others.length > 0 || files.length > 1) {
    return { kind: "file", files };
  }

  return { kind: "file", files };
}
