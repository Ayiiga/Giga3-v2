import type { GigaTemplateModeId } from "@/lib/gigasocial/templateMeta";
import type { SocialPost } from "@/lib/gigasocial/types";

export type TemplateAnalysisHints = {
  sceneStructure?: string[];
  visualStyle?: string;
  captionStructure?: string;
  generationConstraints?: string[];
  aspectRatio?: string;
  attributionLine?: string;
};

export type TemplateHandoffPayload = {
  sourcePostId: string;
  mode: GigaTemplateModeId;
  userIdea: string;
  attributionLine: string;
  creatorHandle: string;
  aspectRatio?: string;
  sceneStructure?: string[];
  visualStyle?: string;
  captionStructure?: string;
  generationConstraints?: string[];
};

const STORAGE_KEY = "giga3_gigasocial_template_handoff";

export function buildTemplateHandoffFromPost(
  post: SocialPost,
  mode: GigaTemplateModeId,
  userIdea: string,
  analysis?: TemplateAnalysisHints | null
): TemplateHandoffPayload {
  return {
    sourcePostId: post._id,
    mode,
    userIdea: userIdea.trim(),
    attributionLine:
      analysis?.attributionLine ??
      `Inspired by a GigaSocial template by @${post.author.handle}.`,
    creatorHandle: post.author.handle,
    aspectRatio: analysis?.aspectRatio ?? (post.mediaType === "video" ? "9:16" : "1:1"),
    sceneStructure: analysis?.sceneStructure,
    visualStyle: analysis?.visualStyle,
    captionStructure: analysis?.captionStructure,
    generationConstraints: analysis?.generationConstraints,
  };
}

/** Full generation prompt — stored in sessionStorage, not duplicated in long URLs. */
export function buildTemplatePrompt(payload: TemplateHandoffPayload): string {
  const lines = [
    payload.userIdea,
    "",
    payload.attributionLine,
    "",
  ];
  if (payload.sceneStructure?.length) {
    lines.push(
      `Suggested scene structure (inspiration only): ${payload.sceneStructure.join(" → ")}`
    );
  }
  if (payload.visualStyle) {
    lines.push(`Visual style reference: ${payload.visualStyle}`);
  }
  if (payload.captionStructure) {
    lines.push(`Caption pattern: ${payload.captionStructure}`);
  }
  lines.push(
    "",
    "Create completely original content inspired by structure and style only.",
    "Do not copy, edit, reproduce, or import the source creator's media, voice, music, watermarks, captions, or likeness."
  );
  if (payload.generationConstraints?.length) {
    lines.push("", ...payload.generationConstraints);
  }
  return lines.join("\n").trim();
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

export function consumeTemplateHandoff(): TemplateHandoffPayload | null {
  const payload = readTemplateHandoff();
  if (payload) clearTemplateHandoff();
  return payload;
}

export function clearTemplateHandoff(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Short URL only — prompt and analysis travel via sessionStorage. Never pass source media URLs. */
export function templateStudioHref(payload: TemplateHandoffPayload): string {
  const base = `templatePost=${encodeURIComponent(payload.sourcePostId)}&templateMode=${encodeURIComponent(payload.mode)}`;
  switch (payload.mode) {
    case "image":
      return `/media?tab=image&action=generate&${base}`;
    case "video":
      return `/media?tab=video&${base}`;
    case "sound":
      return `/gigasocial/?compose=template&${base}`;
    case "full":
    default:
      return `/gigaedit/?tab=video&${base}`;
  }
}

export function applyTemplateHandoffToMediaSeed(args: {
  handoff: TemplateHandoffPayload;
  tab: "image" | "video";
}): {
  tab: "image" | "video";
  category: string;
  prompt: string;
  action: "generate" | null;
} {
  return {
    tab: args.tab,
    category: "anime_art",
    prompt: buildTemplatePrompt(args.handoff),
    action: args.tab === "image" ? "generate" : null,
  };
}
