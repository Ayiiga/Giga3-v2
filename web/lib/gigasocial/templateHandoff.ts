import { buildImageStudioActionUrl } from "@/lib/chat/imageStudioLinks";
import type { GigaTemplateModeId } from "@/lib/gigasocial/templateMeta";
import type { SocialPost } from "@/lib/gigasocial/types";

export type TemplateHandoffPayload = {
  sourcePostId: string;
  mode: GigaTemplateModeId;
  userIdea: string;
  attributionLine: string;
  creatorHandle: string;
  primaryImageUrl?: string;
  primaryVideoUrl?: string;
  aspectRatio?: string;
};

const STORAGE_KEY = "giga3_gigasocial_template_handoff";

export function buildTemplateHandoffFromPost(
  post: SocialPost,
  mode: GigaTemplateModeId,
  userIdea: string
): TemplateHandoffPayload {
  const image = post.mediaItems?.find((m) => m.type === "image");
  const video = post.mediaItems?.find((m) => m.type === "video");
  return {
    sourcePostId: post._id,
    mode,
    userIdea: userIdea.trim(),
    attributionLine: `Inspired by a GigaSocial template by @${post.author.handle}.`,
    creatorHandle: post.author.handle,
    primaryImageUrl: image?.url ?? (post.mediaType === "image" ? post.mediaUrl : undefined),
    primaryVideoUrl: video?.url ?? (post.mediaType === "video" ? post.mediaUrl : undefined),
    aspectRatio: post.mediaType === "video" || post.postType === "video" ? "9:16" : "1:1",
  };
}

export function persistTemplateHandoff(payload: TemplateHandoffPayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readTemplateHandoff(): TemplateHandoffPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TemplateHandoffPayload;
  } catch {
    return null;
  }
}

export function clearTemplateHandoff(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

function encodePrompt(text: string): string {
  return encodeURIComponent(text.slice(0, 1200));
}

export function templateStudioHref(payload: TemplateHandoffPayload): string {
  const idea =
    payload.userIdea ||
    "Create original content inspired by this GigaSocial template structure.";
  const prompt = `${idea}\n\n${payload.attributionLine}\n\nCreate original content — do not copy the source media.`;

  switch (payload.mode) {
    case "image":
      return `${buildImageStudioActionUrl("edit", payload.primaryImageUrl)}&prompt=${encodePrompt(prompt)}&templatePost=${payload.sourcePostId}`;
    case "video":
      return `/media?tab=video&templatePost=${payload.sourcePostId}&prompt=${encodePrompt(prompt)}${
        payload.primaryVideoUrl ? `&source=${encodeURIComponent(payload.primaryVideoUrl)}` : ""
      }`;
    case "sound":
      return `/gigasocial/?compose=1&templatePost=${payload.sourcePostId}&templateMode=sound&prompt=${encodePrompt(prompt)}`;
    case "full":
    default:
      if (payload.primaryVideoUrl) {
        return `/gigaedit/?templatePost=${payload.sourcePostId}&prompt=${encodePrompt(prompt)}&import=${encodeURIComponent(payload.primaryVideoUrl)}`;
      }
      if (payload.primaryImageUrl) {
        return `/media?tab=image&action=edit&source=${encodeURIComponent(payload.primaryImageUrl)}&templatePost=${payload.sourcePostId}&prompt=${encodePrompt(prompt)}`;
      }
      return `/media?tab=video&templatePost=${payload.sourcePostId}&prompt=${encodePrompt(prompt)}`;
  }
}
